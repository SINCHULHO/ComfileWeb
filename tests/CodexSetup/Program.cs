using ComfileWeb.Services;
using Tomlyn;
using Tomlyn.Model;

void Assert(bool condition, string text) { if (!condition) throw new Exception(text); }
var root = Path.Combine(Path.GetTempPath(), "comfileweb-codex-test-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
try
{
    var exe = Path.Combine(root, "한글 경로", "ComfileWeb.exe");
    Directory.CreateDirectory(Path.GetDirectoryName(exe)!);
    File.WriteAllText(exe, "test");
    var config = Path.Combine(root, "config.toml");
    var setup = new CodexSetupService();
    setup.Install(config, exe);
    var first = Toml.ToModel(File.ReadAllText(config));
    Assert(((TomlTable)((TomlTable)first["mcp_servers"])["comfileweb"])["command"].Equals(exe), "Path round trip");
    var source = """
        # 사용자 설정
        model = "test-model"
        [mcp_servers.other]
        command = 'keep.exe'
        [mcp_servers."comfileweb"]
        url = 'https://old.example'
        enabled = false
        disabled_tools = ['device_write']
        [mcp_servers.comfileweb.env]
        CUSTOM = 'keep'
        COMFILEWEB_MCP_INSTANCE = 'old'
        [projects.'D:\My Project']
        trust_level = 'trusted'
        """;
    File.WriteAllText(config, source);
    setup.Install(config, exe);
    var result = File.ReadAllText(config);
    var model = Toml.ToModel(result);
    var servers = (TomlTable)model["mcp_servers"];
    var server = (TomlTable)servers["comfileweb"];
    Assert(model["model"].Equals("test-model") && model.ContainsKey("projects"), "User settings lost");
    Assert(((TomlTable)servers["other"])["command"].Equals("keep.exe"), "Other server lost");
    Assert(!server.ContainsKey("url") && server["enabled"].Equals(true), "Transport not replaced");
    Assert(((TomlArray)server["disabled_tools"])[0]!.Equals("device_write"), "Tool restrictions lost");
    Assert(((TomlTable)server["env"])["CUSTOM"].Equals("keep") && !((TomlTable)server["env"]).ContainsKey("COMFILEWEB_MCP_INSTANCE"), "Environment not preserved");
    Assert(Directory.GetFiles(root, "*.bak").Any(p => File.ReadAllText(p) == source), "Original backup missing");
    setup.Install(config, exe);
    Assert(File.ReadAllText(config) == result, "Repeated setup changed output");
    File.WriteAllText(config, "[broken");
    try { setup.Install(config, exe); throw new Exception("Invalid TOML accepted"); } catch (Tomlyn.TomlException) { }
    Assert(File.ReadAllText(config) == "[broken", "Invalid source overwritten");
    File.WriteAllText(config, source);
    using (var locked = new FileStream(config, FileMode.Open, FileAccess.Read, FileShare.Read))
    {
        try { setup.Install(config, exe); throw new Exception("Locked file overwritten"); } catch (IOException) { }
    }
    Assert(File.ReadAllText(config) == source, "Failed replacement lost original");
    Assert(Directory.GetFiles(root, "*.tmp").Length == 0, "Temporary file leaked");
    Console.WriteLine("PASS: new config, Unicode path, existing settings/restrictions, backup, repeat, malformed TOML and locked file.");
}
finally
{
    if (Path.GetDirectoryName(root) != Path.GetTempPath().TrimEnd(Path.DirectorySeparatorChar) || !Path.GetFileName(root).StartsWith("comfileweb-codex-test-")) throw new Exception("Unsafe cleanup path");
    Directory.Delete(root, true);
}
