using System.Text;
using Tomlyn;
using Tomlyn.Model;

namespace ComfileWeb.Services;

public sealed class CodexSetupService
{
    private readonly object sync = new();
    public static string ConfigPath => Path.Combine(
        Environment.GetEnvironmentVariable("CODEX_HOME") is { Length: > 0 } home
            ? home : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".codex"), "config.toml");
    public static string Executable => Path.Combine(AppContext.BaseDirectory, "ComfileWeb.exe");

    // 다른 서버와 사용자 권한 설정은 유지하고 이 앱의 실행 정보만 갱신한다.
    public static string Configure(string source, string executable, string? instance)
    {
        var model = Toml.ToModel(source);
        if (!model.TryGetValue("mcp_servers", out var value)) model["mcp_servers"] = value = new TomlTable();
        if (value is not TomlTable servers) throw new InvalidOperationException("Invalid MCP table.");
        if (!servers.TryGetValue("comfileweb", out var entry)) servers["comfileweb"] = entry = new TomlTable();
        if (entry is not TomlTable server) throw new InvalidOperationException("Invalid ComfileWEB table.");
        foreach (var key in new[] { "url", "bearer_token_env_var", "http_headers", "env_http_headers" }) server.Remove(key);
        server["command"] = executable;
        server["args"] = new TomlArray { "--mcp" };
        server["cwd"] = Path.GetDirectoryName(executable)!;
        server["enabled"] = true;
        if (!server.TryGetValue("env", out var environment)) server["env"] = environment = new TomlTable();
        if (environment is not TomlTable env) throw new InvalidOperationException("Invalid environment table.");
        if (string.IsNullOrEmpty(instance)) env.Remove("COMFILEWEB_MCP_INSTANCE");
        else env["COMFILEWEB_MCP_INSTANCE"] = instance;
        var result = Toml.FromModel(model);
        if (Toml.Parse(result).HasErrors) throw new InvalidOperationException("Invalid generated configuration.");
        return result;
    }

    public void Install(string path, string executable, string? instance = null)
    {
        lock (sync)
        {
            if (!File.Exists(executable)) throw new FileNotFoundException("Published executable required.");
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            // 중복 클릭과 다른 ComfileWEB 프로세스의 동시 저장을 막는다.
            using var guard = new FileStream(path + ".comfileweb.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            var existed = File.Exists(path);
            var original = existed ? File.ReadAllBytes(path) : [];
            var source = new UTF8Encoding(false, true).GetString(original).TrimStart('\uFEFF');
            var updated = Configure(source, executable, instance);
            var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    stream.Write(Encoding.UTF8.GetBytes(updated));
                    stream.Flush(true);
                }
                if (existed)
                {
                    if (!File.ReadAllBytes(path).SequenceEqual(original)) throw new IOException("Configuration changed. Retry.");
                    File.Replace(temporary, path, path + ".comfileweb-" + Guid.NewGuid().ToString("N") + ".bak");
                }
                else File.Move(temporary, path, false);
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
    }
}
