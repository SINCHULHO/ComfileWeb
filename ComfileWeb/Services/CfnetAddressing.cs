using System.Globalization;

namespace ComfileWeb.Services;

public static class CfnetAddressing
{
    public static bool TryParseAddress(string? text, out bool isOutput, out int moduleIndex, out int bitIndex)
    {
        isOutput = false;
        moduleIndex = 0;
        bitIndex = 0;

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
            isOutput = true;
        }
        else if (prefix == "DI")
        {
            isOutput = false;
        }
        else
        {
            return false;
        }

        if (!int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out moduleIndex)
            || !int.TryParse(parts[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out bitIndex))
        {
            return false;
        }

        if (moduleIndex < 0)
        {
            return false;
        }

        if (bitIndex < 0 || bitIndex > 15)
        {
            return false;
        }

        return true;
    }
}
