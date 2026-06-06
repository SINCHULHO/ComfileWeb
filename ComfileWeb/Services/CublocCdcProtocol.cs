using System.IO.Ports;
using System.Text;

namespace ComfileWeb.Services;

public readonly record struct MonitorEntry(byte MonType, ushort MonIndex)
{
    public string Key => $"{MonType}:{MonIndex}";
}

public static class CublocCdcProtocol
{
    private const int EntrySize = 3;
    private const int MaxBodyLength = 1024;
    private const byte FrameTail = 0x0A;

    public static byte[] BuildMonRequest(IReadOnlyList<MonitorEntry> entries)
    {
        int count = Math.Min(entries.Count, MaxBodyLength / EntrySize);
        int bodyLength = count * EntrySize;
        byte[] buffer = new byte[3 + 2 + bodyLength + 1];
        int pos = 0;

        buffer[pos++] = (byte)'M';
        buffer[pos++] = (byte)'O';
        buffer[pos++] = (byte)'N';
        buffer[pos++] = (byte)(bodyLength & 0xFF);
        buffer[pos++] = (byte)((bodyLength >> 8) & 0xFF);

        for (int i = 0; i < count; i++)
        {
            buffer[pos++] = entries[i].MonType;
            buffer[pos++] = (byte)(entries[i].MonIndex & 0xFF);
            buffer[pos++] = (byte)((entries[i].MonIndex >> 8) & 0xFF);
        }

        buffer[pos] = FrameTail;
        return buffer;
    }

    public static Dictionary<string, int>? ReadMonitorValues(SerialPort serial, IReadOnlyList<MonitorEntry> entries)
    {
        byte[] request = BuildMonRequest(entries);
        serial.Write(request, 0, request.Length);

        byte[] header = new byte[3];
        ReadExact(serial, header, header.Length);
        if (header[0] != (byte)'M' || header[1] != (byte)'O' || header[2] != (byte)'N')
        {
            return null;
        }

        byte[] lenBuffer = new byte[2];
        ReadExact(serial, lenBuffer, lenBuffer.Length);
        int bodyLength = lenBuffer[0] | (lenBuffer[1] << 8);
        if (bodyLength <= 0 || bodyLength > MaxBodyLength)
        {
            return null;
        }

        byte[] body = new byte[bodyLength];
        ReadExact(serial, body, body.Length);
        if (serial.ReadByte() != FrameTail)
        {
            return null;
        }

        return BuildMonitorValuesDictionary(body, entries);
    }

    public static bool WriteValue(SerialPort serial, int monType, int monIndex, int value, out string errorText)
    {
        errorText = string.Empty;
        int valueSize = CublocAddressing.GetValueSize(monType);
        if (valueSize <= 0)
        {
            errorText = "Unsupported address type.";
            return false;
        }

        byte[] requestBody = new byte[3 + valueSize];
        requestBody[0] = (byte)monType;
        requestBody[1] = (byte)(monIndex & 0xFF);
        requestBody[2] = (byte)((monIndex >> 8) & 0xFF);

        for (int i = 0; i < valueSize; i++)
        {
            requestBody[3 + i] = (byte)((value >> (8 * i)) & 0xFF);
        }

        byte[] frame = BuildCommandFrame("WRT", requestBody);
        serial.Write(frame, 0, frame.Length);

        byte[] header = new byte[3];
        ReadExact(serial, header, header.Length);
        string command = Encoding.ASCII.GetString(header);
        if (command.Equals("ERR", StringComparison.Ordinal))
        {
            errorText = ReadAsciiLine(serial, command);
            return false;
        }

        if (!command.Equals("WRT", StringComparison.Ordinal))
        {
            errorText = "Unexpected response: " + command;
            return false;
        }

        byte[] lenBuffer = new byte[2];
        ReadExact(serial, lenBuffer, lenBuffer.Length);
        int bodyLength = lenBuffer[0] | (lenBuffer[1] << 8);
        string bodyText = string.Empty;
        if (bodyLength > 0)
        {
            byte[] body = new byte[bodyLength];
            ReadExact(serial, body, body.Length);
            bodyText = Encoding.ASCII.GetString(body);
        }

        if (serial.ReadByte() != FrameTail)
        {
            errorText = "Invalid response tail.";
            return false;
        }

        if (bodyText.Contains("OK", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        errorText = string.IsNullOrWhiteSpace(bodyText) ? "Write failed." : "Write failed: " + bodyText;
        return false;
    }

    private static byte[] BuildCommandFrame(string command, byte[] body)
    {
        int bodyLength = body.Length;
        byte[] frame = new byte[3 + 2 + bodyLength + 1];
        frame[0] = (byte)command[0];
        frame[1] = (byte)command[1];
        frame[2] = (byte)command[2];
        frame[3] = (byte)(bodyLength & 0xFF);
        frame[4] = (byte)((bodyLength >> 8) & 0xFF);
        Buffer.BlockCopy(body, 0, frame, 5, bodyLength);
        frame[^1] = FrameTail;
        return frame;
    }

    private static Dictionary<string, int>? BuildMonitorValuesDictionary(byte[] body, IReadOnlyList<MonitorEntry> entries)
    {
        Dictionary<string, int> values = [];
        int pos = 0;

        foreach (MonitorEntry entry in entries)
        {
            int size = CublocAddressing.GetValueSize(entry.MonType);
            if (size <= 0 || pos + size > body.Length)
            {
                return null;
            }

            int value = size switch
            {
                1 => body[pos],
                2 => body[pos] | (body[pos + 1] << 8),
                4 => body[pos] | (body[pos + 1] << 8) | (body[pos + 2] << 16) | (body[pos + 3] << 24),
                _ => 0,
            };

            values[entry.Key] = value;
            pos += size;
        }

        return values;
    }

    private static void ReadExact(SerialPort serial, byte[] buffer, int count)
    {
        int offset = 0;
        while (offset < count)
        {
            int read = serial.Read(buffer, offset, count - offset);
            if (read <= 0)
            {
                throw new TimeoutException("Serial read returned 0 bytes.");
            }

            offset += read;
        }
    }

    private static string ReadAsciiLine(SerialPort serial, string prefix)
    {
        StringBuilder builder = new(prefix);
        while (true)
        {
            int value = serial.ReadByte();
            if (value < 0 || value == FrameTail)
            {
                break;
            }

            if (value != '\r')
            {
                builder.Append((char)value);
            }
        }

        return builder.ToString();
    }
}
