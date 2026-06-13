using System.Net.WebSockets;
using System.IO.Ports;
using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using ComfileTech.Cfnet.Cfheader;

namespace ComfileWeb.Services;

public sealed class VisualizationRuntimeService
{
    private const char RecordSeparator = (char)0x1e;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly object _sync = new();
    private readonly UsbCdcService _usbCdc;
    private readonly ILogger<VisualizationRuntimeService> _logger;
    private readonly Dictionary<string, int> _values = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<Guid, WebSocket> _clients = new();
    private readonly Dictionary<string, PendingWrite> _pendingWrites = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _addressByEntryKey = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<CfnetEntry> _cfnetEntries = [];
    private List<MonitorEntry> _entries = [];
    private CancellationTokenSource? _pollingCts;
    private Task? _pollingTask;
    private int _pollingIntervalMs = 50;
    private string? _lastError;
    private DateTimeOffset? _cfnetDisconnectDetectedAt;
    private bool _cfnetDisconnectAlertSent;
    private DateTimeOffset? _cfnetRetryAt;
    private bool _running;

    public VisualizationRuntimeService(UsbCdcService usbCdc, ILogger<VisualizationRuntimeService> logger)
    {
        _usbCdc = usbCdc;
        _logger = logger;
    }

    public async Task HandleWebSocketAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        var messageBuilder = new StringBuilder();
        Guid clientId = Guid.NewGuid();
        _clients[clientId] = socket;

        try
        {
            while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                WebSocketReceiveResult receiveResult = await socket.ReceiveAsync(buffer, cancellationToken);
                if (receiveResult.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                messageBuilder.Append(Encoding.UTF8.GetString(buffer, 0, receiveResult.Count));
                if (!receiveResult.EndOfMessage)
                {
                    continue;
                }

                string frame = messageBuilder.ToString();
                messageBuilder.Clear();

                string[] parts = frame.Split(RecordSeparator, StringSplitOptions.RemoveEmptyEntries);
                foreach (string part in parts)
                {
                    await HandleMessagePartAsync(socket, part, cancellationToken);
                }
            }
        }
        catch
        {
        }
        finally
        {
            _clients.TryRemove(clientId, out _);
            if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                try
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);
                }
                catch
                {
                }
            }
        }
    }

    private async Task HandleMessagePartAsync(WebSocket socket, string messagePart, CancellationToken cancellationToken)
    {
        using JsonDocument document = JsonDocument.Parse(messagePart);
        JsonElement root = document.RootElement;

        if (!root.TryGetProperty("type", out JsonElement typeElement))
        {
            await SendJsonAsync(socket, new { }, cancellationToken);
            return;
        }

        if (typeElement.ValueKind != JsonValueKind.Number || typeElement.GetInt32() != 1)
        {
            return;
        }

        string invocationId = root.TryGetProperty("invocationId", out JsonElement idElement)
            ? idElement.GetString() ?? string.Empty
            : string.Empty;

        string target = root.TryGetProperty("target", out JsonElement targetElement)
            ? targetElement.GetString() ?? string.Empty
            : string.Empty;

        JsonElement? argument = null;
        if (root.TryGetProperty("arguments", out JsonElement arguments)
            && arguments.ValueKind == JsonValueKind.Array
            && arguments.GetArrayLength() > 0)
        {
            argument = arguments[0].Clone();
        }

        switch (target)
        {
            case "Start":
            {
                Dictionary<string, int> snapshot;
                var runtimeState = new { running = false, error = (string?)null };
                lock (_sync)
                {
                    _values.Clear();
                    _pendingWrites.Clear();
                    _addressByEntryKey.Clear();
                    _cfnetEntries.Clear();
                    _entries = [];
                    if (argument is { ValueKind: JsonValueKind.Object } startArg
                        && startArg.TryGetProperty("addresses", out JsonElement addresses)
                        && addresses.ValueKind == JsonValueKind.Array)
                    {
                        AddEntries(addresses);
                    }

                    if (argument is { ValueKind: JsonValueKind.Object } startArg2
                        && startArg2.TryGetProperty("pollingIntervalMs", out JsonElement pollingElement)
                        && pollingElement.ValueKind == JsonValueKind.Number)
                    {
                        _pollingIntervalMs = Math.Clamp(pollingElement.GetInt32(), 50, 5000);
                    }

                    if (argument is { ValueKind: JsonValueKind.Object } startArg3
                        && startArg3.TryGetProperty("usbCdc", out JsonElement usbCdc)
                        && usbCdc.ValueKind == JsonValueKind.Object)
                    {
                        string requestedPort = usbCdc.TryGetProperty("portName", out JsonElement portElement)
                            ? (portElement.GetString() ?? string.Empty).Trim()
                            : string.Empty;
                        int requestedBaud = usbCdc.TryGetProperty("baudRate", out JsonElement baudElement)
                            && baudElement.ValueKind == JsonValueKind.Number
                            ? baudElement.GetInt32()
                            : 115200;

                        if (!_usbCdc.IsConnected)
                        {
                            if (string.IsNullOrWhiteSpace(requestedPort))
                            {
                                IReadOnlyList<string> ports = _usbCdc.GetAvailablePorts();
                                if (ports.Count > 0)
                                {
                                    requestedPort = ports[0];
                                }
                            }

                            if (!string.IsNullOrWhiteSpace(requestedPort))
                            {
                                bool opened = _usbCdc.Connect(requestedPort, requestedBaud > 0 ? requestedBaud : 115200);
                                _logger.LogInformation("USB-CDC auto connect on runtime start: Port={Port}, Opened={Opened}", requestedPort, opened);
                            }
                        }
                    }

                    if (_entries.Count == 0)
                    {
                        if (_cfnetEntries.Count > 0)
                        {
                            _running = true;
                            _lastError = null;
                            _pollingCts?.Cancel();
                            _pollingCts?.Dispose();
                            _pollingCts = new CancellationTokenSource();
                            _pollingTask = Task.Run(() => PollLoopAsync(_pollingCts.Token), CancellationToken.None);
                            runtimeState = new { running = true, error = (string?)null };
                            snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                            _logger.LogInformation("CFNET runtime started. Entries={EntryCount}, Polling={PollingInterval}ms", _cfnetEntries.Count, _pollingIntervalMs);
                        }
                        else
                        {
                            _running = false;
                            _lastError = "No runtime addresses.";
                            runtimeState = new { running = false, error = _lastError };
                            snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                        }
                    }
                    else if (_cfnetEntries.Count > 0)
                    {
                        _running = false;
                        _lastError = "CUBLOC2 and CFNET addresses cannot be mixed.";
                        runtimeState = new { running = false, error = _lastError };
                        snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                    }
                    else if (!_usbCdc.TryGetOpenPort(out SerialPort? port) || port is null)
                    {
                        _running = false;
                        _lastError = "CUBLOC2 COM port is not open.";
                        runtimeState = new { running = false, error = _lastError };
                        snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                    }
                    else
                    {
                        _running = true;
                        _lastError = null;
                        _pollingCts?.Cancel();
                        _pollingCts?.Dispose();
                        _pollingCts = new CancellationTokenSource();
                        _pollingTask = Task.Run(() => PollLoopAsync(_pollingCts.Token), CancellationToken.None);
                        runtimeState = new { running = true, error = (string?)null };
                        snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                        _logger.LogInformation("CUBLOC runtime started. Entries={EntryCount}, Polling={PollingInterval}ms", _entries.Count, _pollingIntervalMs);
                    }
                }
                await SendCompletionAsync(socket, invocationId, runtimeState, cancellationToken);
                await SendInvocationAsync(socket, "RuntimeStateChanged", runtimeState, cancellationToken);
                await SendInvocationAsync(socket, "RuntimeValuesChanged", new { values = snapshot }, cancellationToken);
                return;
            }
            case "Stop":
            {
                lock (_sync)
                {
                    _running = false;
                    _pollingCts?.Cancel();
                    _pollingCts?.Dispose();
                    _pollingCts = null;
                }

                _usbCdc.Disconnect();

                _logger.LogInformation("CUBLOC runtime stopped.");

                var runtimeState = new { running = false, error = (string?)null };
                await SendCompletionAsync(socket, invocationId, runtimeState, cancellationToken);
                await SendInvocationAsync(socket, "RuntimeStateChanged", runtimeState, cancellationToken);
                return;
            }
            case "WriteBit":
            {
                string address = string.Empty;
                int value = 0;

                if (argument is { ValueKind: JsonValueKind.Object } writeArg)
                {
                    if (writeArg.TryGetProperty("address", out JsonElement addressElement))
                    {
                        address = addressElement.GetString() ?? string.Empty;
                    }

                    if (writeArg.TryGetProperty("value", out JsonElement valueElement)
                        && valueElement.ValueKind == JsonValueKind.Number)
                    {
                        value = (int)Math.Round(valueElement.GetDouble(), MidpointRounding.AwayFromZero);
                    }
                }

                Dictionary<string, double> snapshot;
                bool isRunning;
                string? errorText;
                lock (_sync)
                {
                    isRunning = _running;
                    errorText = _lastError;
                    if (_running && !string.IsNullOrWhiteSpace(address)
                        && CublocAddressing.TryParseMonitorAddress(address, out int monType, out int monIndex))
                    {
                        _pendingWrites[address] = new PendingWrite(address, monType, monIndex, value);
                        _logger.LogInformation("Queued write: Address={Address}, MonType={MonType}, MonIndex={MonIndex}, Value={Value}", address, monType, monIndex, value);
                    }
                    else if (_running && !string.IsNullOrWhiteSpace(address)
                        && CfnetAddressing.TryParseAddress(address, out bool isOutput, out int moduleIndex, out int bitIndex)
                        && isOutput)
                    {
                        _pendingWrites[address] = new PendingWrite(address, 0, 0, value);
                        _logger.LogInformation("Queued CFNET write: Address={Address}, Value={Value}", address, value);
                    }

                    snapshot = new Dictionary<string, double>(_values.ToDictionary(pair => pair.Key, pair => (double)pair.Value, StringComparer.OrdinalIgnoreCase), StringComparer.OrdinalIgnoreCase);
                }

                var runtimeState = new { running = isRunning, error = errorText };
                await SendCompletionAsync(socket, invocationId, runtimeState, cancellationToken);
                await SendInvocationAsync(socket, "RuntimeValuesChanged", new { values = snapshot }, cancellationToken);
                return;
            }
            case "AddAddresses":
            {
                Dictionary<string, int> snapshot;
                lock (_sync)
                {
                    if (argument is { ValueKind: JsonValueKind.Object } addArg
                        && addArg.TryGetProperty("addresses", out JsonElement addresses)
                        && addresses.ValueKind == JsonValueKind.Array)
                    {
                        AddEntries(addresses);
                    }

                    snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                }

                await SendCompletionAsync(socket, invocationId, new { ok = true }, cancellationToken);
                await SendInvocationAsync(socket, "RuntimeValuesChanged", new { values = snapshot }, cancellationToken);
                return;
            }
            default:
                await SendCompletionAsync(socket, invocationId, new { ok = true }, cancellationToken);
                return;
        }
    }

    private static Task SendCompletionAsync(WebSocket socket, string invocationId, object result, CancellationToken cancellationToken)
    {
        return SendJsonAsync(socket, new
        {
            type = 3,
            invocationId,
            result
        }, cancellationToken);
    }

    private static Task SendInvocationAsync(WebSocket socket, string target, object argument, CancellationToken cancellationToken)
    {
        return SendJsonAsync(socket, new
        {
            type = 1,
            target,
            arguments = new[] { argument }
        }, cancellationToken);
    }

    private static async Task SendJsonAsync(WebSocket socket, object payload, CancellationToken cancellationToken)
    {
        if (socket.State != WebSocketState.Open)
        {
            return;
        }

        string json = JsonSerializer.Serialize(payload, JsonOptions) + RecordSeparator;
        byte[] bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
    }

    private async Task PollLoopAsync(CancellationToken cancellationToken)
    {
        using PeriodicTimer timer = new(TimeSpan.FromMilliseconds(_pollingIntervalMs));
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await PollOnceAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "CUBLOC runtime polling failed.");
            }

            await timer.WaitForNextTickAsync(cancellationToken);
        }
    }

    private Task PollOnceAsync(CancellationToken cancellationToken)
    {
        Dictionary<string, int>? snapshot = null;
        bool stateChanged = false;
        string? stateError = null;

        lock (_sync)
        {
            if (!_running)
            {
                return Task.CompletedTask;
            }

            if (_cfnetEntries.Count > 0)
            {
                if (_cfnetRetryAt is not null && DateTimeOffset.UtcNow < _cfnetRetryAt.Value)
                {
                    return Task.CompletedTask;
                }

                CfnetPollOutcome outcome = PollCfnetValues();
                snapshot = outcome.Snapshot;
                if (outcome.StateChanged)
                {
                    return snapshot is not null
                        ? Task.WhenAll(
                            BroadcastInvocationAsync("RuntimeStateChanged", new { running = _running, error = outcome.StateError }, cancellationToken),
                            BroadcastInvocationAsync("RuntimeValuesChanged", new { values = snapshot }, cancellationToken))
                        : BroadcastInvocationAsync("RuntimeStateChanged", new { running = _running, error = outcome.StateError }, cancellationToken);
                }

                return snapshot is not null
                    ? BroadcastInvocationAsync("RuntimeValuesChanged", new { values = snapshot }, cancellationToken)
                    : Task.CompletedTask;
            }

            if (!_usbCdc.TryGetOpenPort(out SerialPort? port) || port is null || _entries.Count == 0)
            {
                return Task.CompletedTask;
            }

            ApplyPendingWrites(port);
            Dictionary<string, int>? values = CublocCdcProtocol.ReadMonitorValues(port, _entries);
            if (values is null)
            {
                if (_lastError != "Invalid monitor response.")
                {
                    _lastError = "Invalid monitor response.";
                    stateChanged = true;
                    stateError = _lastError;
                    _logger.LogWarning("CUBLOC poll failed: invalid MON response.");
                }
            }
            else
            {
                foreach ((string entryKey, int value) in values)
                {
                    if (_addressByEntryKey.TryGetValue(entryKey, out string? address))
                    {
                        _values[address] = value;
                    }
                }
                if (!string.IsNullOrWhiteSpace(_lastError))
                {
                    stateChanged = true;
                }
                _lastError = null;
                snapshot = new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase);
                _logger.LogDebug("CUBLOC poll OK. ValueCount={Count}", snapshot.Count);
            }
        }

        if (snapshot is not null)
        {
            if (stateChanged)
            {
                return Task.WhenAll(
                    BroadcastInvocationAsync("RuntimeStateChanged", new { running = _running, error = (string?)null }, cancellationToken),
                    BroadcastInvocationAsync("RuntimeValuesChanged", new { values = snapshot }, cancellationToken));
            }

            return BroadcastInvocationAsync("RuntimeValuesChanged", new { values = snapshot }, cancellationToken);
        }

        if (stateChanged)
        {
            return BroadcastInvocationAsync("RuntimeStateChanged", new { running = _running, error = stateError }, cancellationToken);
        }

        return Task.CompletedTask;
    }

    private async Task BroadcastInvocationAsync(string target, object argument, CancellationToken cancellationToken)
    {
        KeyValuePair<Guid, WebSocket>[] clients = _clients.ToArray();
        foreach ((Guid clientId, WebSocket socket) in clients)
        {
            if (socket.State != WebSocketState.Open)
            {
                _clients.TryRemove(clientId, out _);
                continue;
            }

            try
            {
                await SendInvocationAsync(socket, target, argument, cancellationToken);
            }
            catch
            {
                _clients.TryRemove(clientId, out _);
            }
        }
    }

    private void ApplyPendingWrites(SerialPort port)
    {
        if (_pendingWrites.Count == 0)
        {
            return;
        }

        List<PendingWrite> writes = _pendingWrites.Values.ToList();
        _pendingWrites.Clear();

        foreach (PendingWrite write in writes)
        {
            if (!CublocCdcProtocol.WriteValue(port, write.MonType, write.MonIndex, write.Value, out string errorText))
            {
                _lastError = errorText;
                _logger.LogWarning("CUBLOC write failed: Address={Address}, Error={Error}", write.Address, errorText);
            }
            else
            {
                _logger.LogInformation("CUBLOC write OK: Address={Address}, Value={Value}", write.Address, write.Value);
            }
        }
    }

    private void AddEntries(JsonElement addresses)
    {
        HashSet<string> seen = new(_entries.Select(entry => entry.Key), StringComparer.Ordinal);
        foreach (JsonElement item in addresses.EnumerateArray())
        {
            if (!item.TryGetProperty("address", out JsonElement addressElement))
            {
                continue;
            }

            string runtimeAddress = (addressElement.GetString() ?? string.Empty).Trim();
            if (CfnetAddressing.TryParseAddress(runtimeAddress, out bool _, out int _, out int _))
            {
                string cfnetKey = runtimeAddress.ToUpperInvariant();
                if (_cfnetEntries.Any(entry => string.Equals(entry.Key, cfnetKey, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                _cfnetEntries.Add(new CfnetEntry(runtimeAddress));
                if (!_values.ContainsKey(runtimeAddress))
                {
                    _values[runtimeAddress] = 0;
                }

                continue;
            }

            if (!CublocAddressing.TryParseMonitorAddress(runtimeAddress, out int monType, out int monIndex))
            {
                continue;
            }

            MonitorEntry entry = new((byte)monType, (ushort)monIndex);
            if (!seen.Add(entry.Key))
            {
                continue;
            }

            _entries.Add(entry);
            _addressByEntryKey[entry.Key] = runtimeAddress;
            if (!_values.ContainsKey(runtimeAddress))
            {
                _values[runtimeAddress] = 0;
            }

            if (monType is CublocAddressing.MonTypeT or CublocAddressing.MonTypeC)
            {
                int statusType = monType == CublocAddressing.MonTypeT
                    ? CublocAddressing.MonTypeTstat
                    : CublocAddressing.MonTypeCstat;
                string statusAddress = monType == CublocAddressing.MonTypeT
                    ? $"TS{monIndex}"
                    : $"CS{monIndex}";
                MonitorEntry statusEntry = new((byte)statusType, (ushort)monIndex);
                if (seen.Add(statusEntry.Key))
                {
                    _entries.Add(statusEntry);
                    _addressByEntryKey[statusEntry.Key] = statusAddress;
                    if (!_values.ContainsKey(statusAddress))
                    {
                        _values[statusAddress] = 0;
                    }
                }
            }
        }
    }

    private sealed record PendingWrite(string Address, int MonType, int MonIndex, int Value);

    private CfnetPollOutcome PollCfnetValues()
    {
        try
        {
            ApplyPendingCfnetWrites();

            if (Cfheader.Instances.Count == 0)
            {
                return HandleCfnetPollFailure("CFHEADER instance not found.");
            }

            var cfheader0 = Cfheader.Instances[0];
            if (!cfheader0.IsOpen)
            {
                cfheader0.Open();
            }

            cfheader0.Sync();

            foreach (CfnetEntry entry in _cfnetEntries)
            {
                if (!CfnetAddressing.TryParseAddress(entry.Address, out bool isOutput, out int moduleIndex, out int bitIndex))
                {
                    continue;
                }

                if (isOutput)
                {
                    if (moduleIndex >= cfheader0.DigitalOutputModules.Count)
                    {
                        continue;
                    }

                    var doModule = cfheader0.DigitalOutputModules[moduleIndex];
                    if (bitIndex >= doModule.Channels.Count)
                    {
                        continue;
                    }

                    _values[entry.Address] = doModule.Channels[bitIndex].State ? 1 : 0;
                }
                else
                {
                    if (moduleIndex >= cfheader0.DigitalInputModules.Count)
                    {
                        continue;
                    }

                    var diModule = cfheader0.DigitalInputModules[moduleIndex];
                    if (bitIndex >= diModule.Channels.Count)
                    {
                        continue;
                    }

                    _values[entry.Address] = diModule.Channels[bitIndex].State ? 1 : 0;
                }
            }

            bool recovered = _cfnetDisconnectDetectedAt is not null || _cfnetDisconnectAlertSent;
            _cfnetDisconnectDetectedAt = null;
            _cfnetDisconnectAlertSent = false;
            _cfnetRetryAt = null;
            if (!string.IsNullOrWhiteSpace(_lastError))
            {
                _lastError = null;
            }

            return new CfnetPollOutcome(new Dictionary<string, int>(_values, StringComparer.OrdinalIgnoreCase), recovered ? null : null, recovered);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CFNET runtime polling failed.");
            return HandleCfnetPollFailure(ex.Message);
        }
    }

    private CfnetPollOutcome HandleCfnetPollFailure(string message)
    {
        _lastError = message;
        _cfnetDisconnectDetectedAt ??= DateTimeOffset.UtcNow;
        ResetCfnetConnectionHandle();

        if (!_cfnetDisconnectAlertSent && DateTimeOffset.UtcNow - _cfnetDisconnectDetectedAt.Value >= TimeSpan.FromSeconds(5))
        {
            _cfnetDisconnectAlertSent = true;
            _cfnetRetryAt = DateTimeOffset.UtcNow.AddMilliseconds(250);
            return new CfnetPollOutcome(null, "CFNET 연결이 끊어졌습니다.", true);
        }

        if (_cfnetDisconnectAlertSent)
        {
            _cfnetRetryAt = DateTimeOffset.UtcNow.AddMilliseconds(250);
        }

        return new CfnetPollOutcome(null, null, false);
    }

    private void ResetCfnetConnectionHandle()
    {
        try
        {
            if (Cfheader.Instances.Count == 0)
            {
                return;
            }

            var cfheader0 = Cfheader.Instances[0];
            if (cfheader0.IsOpen)
            {
                cfheader0.Close();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CFNET connection reset failed.");
        }
    }

    private void ApplyPendingCfnetWrites()
    {
        if (_pendingWrites.Count == 0)
        {
            return;
        }

        List<PendingWrite> writes = _pendingWrites.Values
            .Where(write => CfnetAddressing.TryParseAddress(write.Address, out bool isOutput, out int _, out int _) && isOutput)
            .ToList();

        foreach (PendingWrite write in writes)
        {
            _pendingWrites.Remove(write.Address);
            if (!CfnetAddressing.TryParseAddress(write.Address, out bool isOutput, out int moduleIndex, out int bitIndex) || !isOutput)
            {
                continue;
            }

            try
            {
                if (Cfheader.Instances.Count == 0)
                {
                    _lastError = "CFHEADER instance not found.";
                    continue;
                }

                var cfheader0 = Cfheader.Instances[0];
                if (!cfheader0.IsOpen)
                {
                    cfheader0.Open();
                }

                if (moduleIndex >= cfheader0.DigitalOutputModules.Count)
                {
                    _lastError = $"CFNET DO module not found: {moduleIndex}";
                    continue;
                }

                var module = cfheader0.DigitalOutputModules[moduleIndex];
                if (bitIndex >= module.Channels.Count)
                {
                    _lastError = $"CFNET DO bit out of range: {bitIndex}";
                    continue;
                }

                module.Channels[bitIndex].State = write.Value != 0;
                cfheader0.Sync();
            }
            catch (Exception ex)
            {
                _lastError = ex.Message;
                _logger.LogWarning(ex, "CFNET write failed: Address={Address}", write.Address);
            }
        }
    }

    private sealed record CfnetPollOutcome(Dictionary<string, int>? Snapshot, string? StateError, bool StateChanged);

    private sealed record CfnetEntry(string Address)
    {
        public string Key { get; } = (Address ?? string.Empty).Trim().ToUpperInvariant();
    }
}
