using System.IO.Ports;
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

    public IReadOnlyList<string> GetAvailablePorts()
    {
        return SerialPort.GetPortNames()
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToArray();
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

            var serialPort = new SerialPort(normalizedPort, baudRate)
            {
                NewLine = "\r\n",
                ReadTimeout = 700,
                WriteTimeout = 700,
                DtrEnable = true,
                RtsEnable = true,
                Handshake = Handshake.None,
                Encoding = TextEncoding
            };

            serialPort.Open();
            _port = serialPort;
            return _port.IsOpen;
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
}
