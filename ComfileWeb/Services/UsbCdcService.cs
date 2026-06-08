using System.IO.Ports;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;

namespace ComfileWeb.Services;

public sealed class UsbCdcService
{
    private static readonly Encoding TextEncoding = Encoding.ASCII;
    private readonly object _sync = new();
    private SerialPort? _port;

    public bool TryGetOpenPort(out SerialPort? serialPort)
    {
        lock (_sync)
        {
            if (_port is { IsOpen: true })
            {
                serialPort = _port;
                return true;
            }

            serialPort = null;
            return false;
        }
    }

    public sealed record UsbCdcPortInfo(string PortName, string DisplayName);

    public IReadOnlyList<string> GetAvailablePorts()
    {
        return GetAvailablePortInfos()
            .Select(info => info.PortName)
            .ToArray();
    }

    public IReadOnlyList<UsbCdcPortInfo> GetAvailablePortInfos()
    {
        var ports = SerialPort.GetPortNames()
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (ports.Length == 0)
        {
            return Array.Empty<UsbCdcPortInfo>();
        }

        var friendlyNameByPort = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? GetFriendlyNamesFromWmi()
            : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        return ports
            .Select(portName =>
            {
                string friendlyName = friendlyNameByPort.TryGetValue(portName, out string? value)
                    ? value
                    : string.Empty;
                string displayName = string.IsNullOrWhiteSpace(friendlyName)
                    ? portName
                    : $"{portName} - {friendlyName}";
                return new UsbCdcPortInfo(portName, displayName);
            })
            .ToArray();
    }

    private static Dictionary<string, string> GetFriendlyNamesFromWmi()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Name FROM Win32_PnPEntity WHERE Name LIKE '%(COM%'");
            using ManagementObjectCollection results = searcher.Get();
            foreach (ManagementObject item in results)
            {
                string name = Convert.ToString(item["Name"]) ?? string.Empty;
                if (string.IsNullOrWhiteSpace(name))
                {
                    continue;
                }

                int startIndex = name.LastIndexOf("(COM", StringComparison.OrdinalIgnoreCase);
                if (startIndex < 0)
                {
                    continue;
                }

                int endIndex = name.IndexOf(')', startIndex);
                if (endIndex <= startIndex)
                {
                    continue;
                }

                string portName = name.Substring(startIndex + 1, endIndex - startIndex - 1);
                if (string.IsNullOrWhiteSpace(portName))
                {
                    continue;
                }

                map[portName] = name;
            }
        }
        catch
        {
        }

        return map;
    }

    public bool IsConnected
    {
        get
        {
            lock (_sync)
            {
                return _port is { IsOpen: true };
            }
        }
    }

    public string? ConnectedPortName
    {
        get
        {
            lock (_sync)
            {
                return _port?.PortName;
            }
        }
    }

    public bool Connect(string? portName, int baudRate)
    {
        string normalizedPort = string.IsNullOrWhiteSpace(portName) ? string.Empty : portName.Trim();
        if (string.IsNullOrWhiteSpace(normalizedPort))
        {
            return false;
        }

        lock (_sync)
        {
            DisconnectCore();

            var serialPort = CreateSerialPort(normalizedPort, baudRate);
            serialPort.Open();
            _port = serialPort;
            return _port.IsOpen;
        }
    }

    public bool Test(string? portName, int baudRate)
    {
        string normalizedPort = string.IsNullOrWhiteSpace(portName) ? string.Empty : portName.Trim();
        if (string.IsNullOrWhiteSpace(normalizedPort))
        {
            return false;
        }

        lock (_sync)
        {
            if (_port is { IsOpen: true })
            {
                return string.Equals(_port.PortName, normalizedPort, StringComparison.OrdinalIgnoreCase);
            }

            using var serialPort = CreateSerialPort(normalizedPort, baudRate);
            serialPort.Open();
            return serialPort.IsOpen;
        }
    }

    public void Disconnect()
    {
        lock (_sync)
        {
            DisconnectCore();
        }
    }

    private void DisconnectCore()
    {
        if (_port is null)
        {
            return;
        }

        try
        {
            if (_port.IsOpen)
            {
                _port.Close();
            }
        }
        finally
        {
            _port.Dispose();
            _port = null;
        }
    }

    private static SerialPort CreateSerialPort(string portName, int baudRate)
    {
        return new SerialPort(portName, baudRate > 0 ? baudRate : 115200)
        {
            NewLine = "\r\n",
            ReadTimeout = 700,
            WriteTimeout = 700,
            DtrEnable = true,
            RtsEnable = true,
            Handshake = Handshake.None,
            Encoding = TextEncoding
        };
    }
}
