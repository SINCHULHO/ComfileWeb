using System.Diagnostics;
using System.Text.Json;

namespace ComfileWeb.Services;

internal static class BrowserStartup
{
    internal static string GetBrowserUrl(string? configuredUrls)
    {
        var urls = (configuredUrls ?? "http://localhost:5000").Split(';', StringSplitOptions.RemoveEmptyEntries);
        var selected = urls.FirstOrDefault(url => url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            ?? urls.FirstOrDefault() ?? "http://localhost:5000";
        selected = selected.Replace("://*:", "://localhost:").Replace("://+:", "://localhost:");
        var uri = new UriBuilder(selected);
        if (uri.Host is "0.0.0.0" or "[::]" or "::") uri.Host = "localhost";
        return uri.Uri.AbsoluteUri;
    }

    internal static async Task<bool> IsExistingInstanceAsync(string url)
    {
        // 다른 프로그램이 같은 포트를 사용한다면 ComfileWEB으로 오인하지 않는다.
        try
        {
            using var handler = new SocketsHttpHandler { UseProxy = false };
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
            using var version = JsonDocument.Parse(await client.GetStringAsync(new Uri(new Uri(url), "api/version")));
            if (!version.RootElement.TryGetProperty("version", out var value) || value.ValueKind != JsonValueKind.String)
                return false;
            var html = await client.GetStringAsync(url);
            return html.Contains("window.comfileWebEditorMode = true;", StringComparison.Ordinal)
                && html.Contains("id=\"designSurface\"", StringComparison.Ordinal);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return false;
        }
    }

    internal static void Open(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
            Console.WriteLine($"Opened ComfileWEB in the default browser: {url}");
        }
        catch (Exception ex)
        {
            // 자동 실행 실패 시 주소와 원인을 남겨 사용자가 직접 열 수 있게 한다.
            Console.Error.WriteLine($"Could not open the default browser. Open {url} manually. {ex.Message}");
        }
    }
}

