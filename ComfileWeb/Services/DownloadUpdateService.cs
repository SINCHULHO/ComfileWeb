using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ComfileWeb.Services;

// Cache one optional check per application run, shared by all editor tabs.
public sealed class DownloadUpdateService
{
    private readonly Lazy<Task<string?>> check;

    public DownloadUpdateService() : this(AppUpdateService.CurrentVersion) { }

    public DownloadUpdateService(string currentVersion, HttpMessageHandler? handler = null)
    {
        check = new(() => CheckAsync(currentVersion, handler));
    }

    public Task<string?> CheckAsync() => check.Value;

    private static async Task<string?> CheckAsync(string currentVersion, HttpMessageHandler? handler)
    {
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            using var client = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false })
            {
                Timeout = TimeSpan.FromSeconds(5), MaxResponseContentBufferSize = 1024 * 1024
            };
            client.DefaultRequestHeaders.UserAgent.ParseAdd($"ComfileWEB/{currentVersion}");
            using var response = await client.GetAsync("https://comfilewiki.co.kr/downloads/api.php?product=comfileweb", timeout.Token)
                .WaitAsync(timeout.Token);
            if (response.StatusCode != HttpStatusCode.OK) return null;
            return FindNewerVersion(await response.Content.ReadAsStringAsync(timeout.Token), currentVersion);
        }
        catch { return null; } // Offline or invalid responses must never interrupt editing.
    }

    public static string? FindNewerVersion(string json, string currentVersion)
    {
        if (!Version.TryParse(currentVersion, out var current)) return null;
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object ||
            !root.TryGetProperty("product", out var product) || product.ValueKind != JsonValueKind.String || product.GetString() != "ComfileWEB" ||
            !root.TryGetProperty("files", out var files) || files.ValueKind != JsonValueKind.Array) return null;
        Version? latest = null;
        string? latestText = null;
        foreach (var file in files.EnumerateArray())
        {
            if (file.ValueKind != JsonValueKind.Object ||
                !file.TryGetProperty("name", out var name) || name.ValueKind != JsonValueKind.String ||
                !file.TryGetProperty("version", out var version) || version.ValueKind != JsonValueKind.String ||
                !file.TryGetProperty("legacy", out var legacy) || legacy.ValueKind != JsonValueKind.False) continue;
            var match = Regex.Match(name.GetString()!, @"\AComfileWEB-Setup-([0-9]+\.[0-9]+\.[0-9]{1,5})-win-x64\.exe\z");
            if (!match.Success || version.GetString() != match.Groups[1].Value ||
                !Version.TryParse(match.Groups[1].Value, out var candidate) || candidate <= current ||
                (latest is not null && candidate <= latest)) continue;
            latest = candidate;
            latestText = match.Groups[1].Value;
        }
        return latestText;
    }
}
