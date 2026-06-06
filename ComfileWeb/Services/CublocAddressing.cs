using System.Globalization;

namespace ComfileWeb.Services;

public static class CublocAddressing
{
    public const int MonTypeNone = 0;
    public const int MonTypeI = 1;
    public const int MonTypeQ = 2;
    public const int MonTypeX = 3;
    public const int MonTypeY = 4;
    public const int MonTypeM = 5;
    public const int MonTypeS = 6;
    public const int MonTypeD = 7;
    public const int MonTypeT = 8;
    public const int MonTypeC = 9;
    public const int MonTypeDD = 10;
    public const int MonTypeDF = 11;
    public const int MonTypeR = 12;
    public const int MonTypeRD = 13;
    public const int MonTypeRDD = 16;
    public const int MonTypeRDF = 17;
    public const int MonTypeTstat = 18;
    public const int MonTypeCstat = 19;
    public const int MonTypeSD = 20;

    private static readonly string[] MonitorPrefixes =
    [
        "RDD", "RDF", "RD",
        "DD", "DF", "SD", "TS", "CS",
        "I", "Q", "X", "Y", "M", "S", "C", "T", "D", "R"
    ];

    private static readonly Dictionary<string, int> MonitorPrefixToType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["I"] = MonTypeI,
        ["Q"] = MonTypeQ,
        ["X"] = MonTypeX,
        ["Y"] = MonTypeY,
        ["M"] = MonTypeM,
        ["S"] = MonTypeS,
        ["D"] = MonTypeD,
        ["T"] = MonTypeT,
        ["C"] = MonTypeC,
        ["TS"] = MonTypeTstat,
        ["CS"] = MonTypeCstat,
        ["DD"] = MonTypeDD,
        ["DF"] = MonTypeDF,
        ["SD"] = MonTypeSD,
        ["R"] = MonTypeR,
        ["RD"] = MonTypeRD,
        ["RDD"] = MonTypeRDD,
        ["RDF"] = MonTypeRDF,
    };

    public static bool TryParseMonitorAddress(string? text, out int monType, out int monIndex)
    {
        monType = MonTypeNone;
        monIndex = 0;

        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        string trimmed = text.Trim();
        foreach (string prefix in MonitorPrefixes)
        {
            if (!trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            string suffix = trimmed[prefix.Length..];
            if (!int.TryParse(suffix, NumberStyles.Integer, CultureInfo.InvariantCulture, out monIndex))
            {
                continue;
            }

            if (monIndex < 0 || !MonitorPrefixToType.TryGetValue(prefix, out monType))
            {
                continue;
            }

            return true;
        }

        return false;
    }

    public static int GetValueSize(int monType) => monType switch
    {
        MonTypeI or MonTypeQ or MonTypeX or MonTypeY or MonTypeM or MonTypeS or MonTypeR or MonTypeTstat or MonTypeCstat => 1,
        MonTypeD or MonTypeRD or MonTypeSD => 2,
        MonTypeT or MonTypeC or MonTypeDD or MonTypeDF or MonTypeRDD or MonTypeRDF => 4,
        _ => 0,
    };
}
