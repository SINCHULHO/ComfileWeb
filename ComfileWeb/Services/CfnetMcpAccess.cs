using System.Text.Json.Nodes;
using System.Runtime.InteropServices;
using ComfileTech.Cfnet.Cfheader;

namespace ComfileWeb.Services;

public static class CfnetMcpAccess
{
    // REST 연결, 런타임 폴링, MCP가 같은 장치를 동시에 조작하지 않도록 공유한다.
    public static object SyncRoot { get; } = new();

public static void EnsureNativeLibraries(ILogger logger)
{
    try
    {
        var nativeDirectory = Path.Combine(AppContext.BaseDirectory, "runtimes", "win-x64", "native");
        if (!Directory.Exists(nativeDirectory))
        {
            return;
        }

        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        if (!path.Split(';', StringSplitOptions.RemoveEmptyEntries)
                 .Any(entry => string.Equals(entry.Trim(), nativeDirectory, StringComparison.OrdinalIgnoreCase)))
        {
            Environment.SetEnvironmentVariable("PATH", nativeDirectory + ";" + path);
        }

        NativeLibrary.Load(Path.Combine(nativeDirectory, "libusb-1.0.dll"));
        NativeLibrary.Load(Path.Combine(nativeDirectory, "ComfileTech.Cfnet.Cfheader.Native.dll"));
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Cfnet native library preload failed.");
    }
}

    public static JsonObject Execute(string name, JsonObject args)
    {
        int headerAddress = args["headerAddress"]!.GetValue<int>();
        if (headerAddress < 0 || headerAddress > 7 || Cfheader.Instances.Count <= headerAddress)
            throw new ArgumentException("CFHEADER address is unavailable.");
        var header = Cfheader.Instances[headerAddress];
        if (name == "device_status") return new() { ["success"] = true, ["headerAddress"] = headerAddress, ["connected"] = header.IsOpen };
        if (name == "device_connect" || name == "device_disconnect")
        {
            if (name == "device_connect" && !header.IsOpen) header.Open();
            if (name == "device_disconnect" && header.IsOpen) header.Close();
            return new() { ["success"] = true, ["headerAddress"] = headerAddress, ["connected"] = header.IsOpen };
        }
        if (!header.IsOpen) throw new InvalidOperationException("Connect the CFHEADER explicitly before reading or writing.");
        bool write = name == "device_write";
        var addresses = write ? new[] { args["address"]!.GetValue<string>() }
            : args["addresses"]!.AsArray().Select(a => a!.GetValue<string>()).ToArray();
        var entries = addresses.Select(Parse).ToArray();
        // 모든 항목을 검증한 뒤 장치에 접근한다.
        foreach (var entry in entries)
        {
            _ = Module(header, entry);
            if (entry.Kind == CfnetAddressing.AddressKind.AnalogInput)
                header.AnalogInputModules[entry.Module].Channels[entry.Channel].NumberOfConversions = 1;
        }
        if (write)
        {
            var entry = entries[0];
            int value = args["value"]!.GetValue<int>();
            if (args["confirmed"]?.GetValue<bool>() != true) throw new ArgumentException("confirmed=true is required for real output writes.");
            if (entry.Kind is not (CfnetAddressing.AddressKind.DigitalOutput or CfnetAddressing.AddressKind.AnalogOutput))
                throw new ArgumentException("Only DO and DAC outputs may be written.");
            if (value < 0 || value > (entry.Kind == CfnetAddressing.AddressKind.DigitalOutput ? 1 : 4094))
                throw new ArgumentException("Output value is out of range.");
        }
        header.Sync();
        foreach (var entry in entries) CheckModule(Module(header, entry));
        if (write)
        {
            var entry = entries[0];
            int value = args["value"]!.GetValue<int>();
            if (entry.Kind == CfnetAddressing.AddressKind.DigitalOutput) header.DigitalOutputModules[entry.Module].Channels[entry.Channel].State = value == 1;
            else header.AnalogOutputModules[entry.Module].Channels[entry.Channel].RawValue = (ushort)value;
            header.Sync();
            CheckModule(Module(header, entry));
        }
        var values = new JsonObject();
        foreach (var entry in entries)
        {
            int value = entry.Kind switch
            {
                CfnetAddressing.AddressKind.DigitalInput => header.DigitalInputModules[entry.Module].Channels[entry.Channel].State ? 1 : 0,
                CfnetAddressing.AddressKind.DigitalOutput => header.DigitalOutputModules[entry.Module].Channels[entry.Channel].State ? 1 : 0,
                CfnetAddressing.AddressKind.AnalogInput => header.AnalogInputModules[entry.Module].Channels[entry.Channel].RawValue,
                _ => header.AnalogOutputModules[entry.Module].Channels[entry.Channel].RawValue
            };
            values[entry.Address] = value;
        }
        return new() { ["success"] = true, ["headerAddress"] = headerAddress, ["values"] = values,
            ["sampledAt"] = DateTimeOffset.UtcNow.ToString("O"), ["writeApplied"] = write };
    }

    private sealed record Entry(string Address, CfnetAddressing.AddressKind Kind, int Module, int Channel);
    private static Entry Parse(string address)
    {
        string normalized = address.Trim().ToUpperInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(normalized, @"^(DI|DO|ADC|DAC)\.\d+\.\d+$")
            || !CfnetAddressing.TryParseAddress(normalized, out CfnetAddressing.AddressKind kind, out int module, out int channel)
            || module >= (kind is CfnetAddressing.AddressKind.AnalogInput or CfnetAddressing.AddressKind.AnalogOutput ? 4 : 8))
            throw new ArgumentException("Invalid CFNET address: " + address);
        return new(normalized, kind, module, channel);
    }
    private static IIOModule Module(Cfheader header, Entry entry) => entry.Kind switch
    {
        CfnetAddressing.AddressKind.DigitalInput => header.DigitalInputModules[entry.Module],
        CfnetAddressing.AddressKind.DigitalOutput => header.DigitalOutputModules[entry.Module],
        CfnetAddressing.AddressKind.AnalogInput => header.AnalogInputModules[entry.Module],
        _ => header.AnalogOutputModules[entry.Module]
    };
    private static void CheckModule(IIOModule module)
    {
        if (module.I2cStatus != I2cResult.Success)
        {
            var status = module.I2cStatus;
            module.AcknowledgeI2cFailure();
            throw new IOException("CFNET module communication failed: " + status);
        }
    }
}
