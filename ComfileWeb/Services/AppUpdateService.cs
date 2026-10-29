using System.Diagnostics;
using System.Text.Json;

namespace ComfileWeb.Services;

// 업데이트 대상은 로컬에서 실행한 새 앱만 등록한다. HTTP 요청으로 실행 경로를 받지 않는다.
public sealed class AppUpdateService
{
    public sealed record PendingUpdate(string Executable, string Version, string Url);
    public string Token { get; } = Guid.NewGuid().ToString("N");
    public SemaphoreSlim Gate { get; } = new(1, 1);
    public static string CurrentVersion => typeof(AppUpdateService).Assembly.GetName().Version!.ToString(3);
    private static string PendingPath(string url) => Path.Combine(
        (Environment.GetEnvironmentVariable("COMFILEWEB_UPDATE_DIRECTORY") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ComfileWeb")), $"update-{new Uri(url).Port}.json");

    public static void Queue(string url)
    {
        var path = PendingPath(url);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var executable = Path.Combine(AppContext.BaseDirectory, "ComfileWeb.exe");
        if (!File.Exists(executable)) throw new IOException("Published ComfileWeb.exe is required for an update.");
        var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(new PendingUpdate(executable, CurrentVersion, url)));
        File.Move(temporary, path, true);
    }

    public PendingUpdate? Read(string url)
    {
        try
        {
            var pending = JsonSerializer.Deserialize<PendingUpdate>(File.ReadAllText(PendingPath(url)));
            if (pending is null || string.IsNullOrWhiteSpace(pending.Url) || new Uri(pending.Url).Port != new Uri(url).Port || !File.Exists(pending.Executable)) return null;
            if (!Version.TryParse(pending.Version, out var next) || next <= Version.Parse(CurrentVersion)) return null;
            var actual = FileVersionInfo.GetVersionInfo(pending.Executable);
            if (Path.GetFileName(pending.Executable) != "ComfileWeb.exe" || actual.ProductVersion?.Split('+')[0] != pending.Version) return null;
            return pending;
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException or UriFormatException or System.ComponentModel.Win32Exception) { return null; }
    }

    public void Start(PendingUpdate pending)
    {
        var info = new ProcessStartInfo(pending.Executable)
        {
            UseShellExecute = false, CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(pending.Executable)!
        };
        info.ArgumentList.Add("--no-browser");
        info.ArgumentList.Add("--wait-for-process");
        info.ArgumentList.Add(Environment.ProcessId.ToString());
        info.ArgumentList.Add("--urls"); info.ArgumentList.Add(pending.Url);
        _ = Process.Start(info) ?? throw new IOException("Unable to start updated application.");
    }
}
