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

    internal static async Task<bool> IsExistingInstanceAsync(string url) => await GetExistingVersionAsync(url) is not null;

    internal static async Task<string?> GetExistingVersionAsync(string url)
    {
        // 다른 프로그램이 같은 포트를 사용한다면 ComfileWEB으로 오인하지 않는다.
        try
        {
            using var handler = new SocketsHttpHandler { UseProxy = false };
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
            using var version = JsonDocument.Parse(await client.GetStringAsync(new Uri(new Uri(url), "api/version")));
            if (!version.RootElement.TryGetProperty("version", out var value) || value.ValueKind != JsonValueKind.String)
                return null;
            var html = await client.GetStringAsync(url);
            return html.Contains("window.comfileWebEditorMode = true;", StringComparison.Ordinal)
                && html.Contains("id=\"designSurface\"", StringComparison.Ordinal) ? value.GetString() : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return null;
        }
    }

    internal static async Task<bool> SupportsUpdateAsync(string url)
    {
        try
        {
            using var client = new HttpClient(new SocketsHttpHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(10) };
            using var response = await client.GetAsync(new Uri(new Uri(url), "api/app/update"));
            if (!response.IsSuccessStatusCode) return false;
            using var data = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return data.RootElement.TryGetProperty("currentVersion", out _);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException) { return false; }
    }

    internal static void ShowLegacyUpdateNotice(string existing, string next)
    {
        var korean = System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "ko";
        var message = korean
            ? $"현재 {existing} 버전이 실행 중입니다. 새 버전은 {next}입니다.\n\n이전 버전에는 자동 전환 기능이 없습니다. 작업을 저장하고 실행 중인 ComfileWEB을 종료한 뒤 새 버전을 다시 실행하세요."
            : $"Version {existing} is running. The new version is {next}.\n\nThe previous version cannot update automatically. Save your work, close ComfileWEB, and launch the new version.";
        Console.WriteLine(message);
        if (OperatingSystem.IsWindows()) MessageBoxW(IntPtr.Zero, message, korean ? "ComfileWEB 업데이트 안내" : "ComfileWEB update", 0x40);
    }

    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr window, string text, string caption, uint type);

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

