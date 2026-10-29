using System.IO.Pipes;
using System.Security.Principal;
using System.Text;
using System.Text.Json.Nodes;

namespace ComfileWeb.Services;

// 네트워크에 공개하지 않고 같은 Windows 사용자의 MCP 클라이언트만 받는다.
public sealed class McpPipeService(McpEditorBridge bridge, ProjectStorageService storage,
    VisualizationRuntimeService runtime, ILogger<McpPipeService> logger) : BackgroundService
{
    public static string PipeName => "ComfileWEB.Mcp.v1." + WindowsIdentity.GetCurrent().User!.Value + "."
        + System.Diagnostics.Process.GetCurrentProcess().SessionId + "." + (Environment.GetEnvironmentVariable("COMFILEWEB_MCP_INSTANCE") ?? "default");
    public static JsonObject Failure(string code, string message) => new() { ["success"] = false, ["code"] = code, ["message"] = message };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!OperatingSystem.IsWindows()) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var pipe = new NamedPipeServerStream(PipeName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte,
                    PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
                await pipe.WaitForConnectionAsync(stoppingToken);
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(30));
                using var reader = new StreamReader(pipe, new UTF8Encoding(false), false, 4096, true);
                using var writer = new StreamWriter(pipe, new UTF8Encoding(false), 4096, true) { AutoFlush = true };
                var line = await reader.ReadLineAsync(timeout.Token) ?? "";
                JsonObject response;
                try
                {
                    if (line.Length > 2 * 1024 * 1024) throw new ArgumentException("Request too large.");
                    var request = JsonNode.Parse(line)!.AsObject();
                    string name = request["name"]!.GetValue<string>();
                    var arguments = request["arguments"]?.AsObject() ?? new JsonObject();
                    McpStdioServer.ValidateTool(name, arguments);
                    response = name switch
                    {
                        "list_editors" => bridge.List(),
                        "list_projects" => new JsonObject { ["success"] = true, ["projects"] = System.Text.Json.JsonSerializer.SerializeToNode(storage.List(), new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)) },
                        _ when name.StartsWith("device_", StringComparison.Ordinal) => runtime.ExecuteMcpDevice(name, arguments),
                        _ => await bridge.CallAsync(name, arguments, timeout.Token)
                    };
                }
                catch (Exception ex) { response = Failure("REQUEST_FAILED", ex.Message); }
                await writer.WriteLineAsync(response.ToJsonString().AsMemory(), timeout.Token);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "MCP pipe request ended.");
                await Task.Delay(250, stoppingToken);
            }
        }
    }
}
