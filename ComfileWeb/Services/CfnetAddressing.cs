using System.Globalization;

namespace ComfileWeb.Services;

public static class CfnetAddressing
{
    public enum AddressKind
    {
        DigitalInput,
        DigitalOutput,
        AnalogInput,
        AnalogOutput
    }

    public static bool TryParseAddress(string? text, out bool isOutput, out int moduleIndex, out int bitIndex)
    {
        isOutput = false;
        moduleIndex = 0;
        bitIndex = 0;

        if (!TryParseAddress(text, out AddressKind kind, out moduleIndex, out bitIndex))
        {
            return false;
        }

        if (kind is AddressKind.DigitalOutput or AddressKind.AnalogOutput)
        {
            isOutput = true;
            return true;
        }

        if (kind == AddressKind.DigitalInput)
        {
            isOutput = false;
            return true;
        }

        return false;
    }

    public static bool TryParseAddress(string? text, out AddressKind kind, out int moduleIndex, out int channelIndex)
    {
        kind = AddressKind.DigitalInput;
        moduleIndex = 0;
        channelIndex = 0;

        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        string normalized = text.Trim().Replace(" ", string.Empty);
        string[] parts = normalized.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 3)
        {
            return false;
        }

        string prefix = parts[0].ToUpperInvariant();
        if (prefix == "DO")
        {
            kind = AddressKind.DigitalOutput;
        }
        else if (prefix == "DI")
        {
            kind = AddressKind.DigitalInput;
        }
        else if (prefix == "ADC")
        {
            kind = AddressKind.AnalogInput;
        }
        else if (prefix == "DAC")
        {
            kind = AddressKind.AnalogOutput;
        }
        else
        {
            return false;
        }

        if (!int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out moduleIndex)
            || !int.TryParse(parts[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out channelIndex))
        {
            return false;
        }

        if (moduleIndex < 0)
        {
            return false;
        }

        int maxChannelIndex = kind switch
        {
            AddressKind.AnalogInput => 3,
            AddressKind.AnalogOutput => 1,
            _ => 15
        };
        if (channelIndex < 0 || channelIndex > maxChannelIndex)
        {
            return false;
        }

        return true;
    }
}
