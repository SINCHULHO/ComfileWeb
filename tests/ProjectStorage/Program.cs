using ComfileWeb.Services;
using ComfileWeb.Models;
using Microsoft.Extensions.Configuration;

var directory = Path.Combine(Path.GetTempPath(), "comfile-storage-" + Guid.NewGuid().ToString("N"));
var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ComfileWeb:ProjectsDirectory"] = directory }).Build();
var storage = new ProjectStorageService(configuration);
void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
ProjectSaveRequest Request(string text, bool create = false) => new() { Name = "test", DocumentText = text, FailIfExists = create };
try
{
    await storage.SaveAsync(Request("{\"revision\":1}", true), default);
    await storage.SaveAsync(Request("{\"revision\":2}"), default);
    Check(await storage.LoadAsync("test", default) == "{\"revision\":2}", "Current content");
    Check(await File.ReadAllTextAsync(Path.Combine(directory, "test.cweb.bak")) == "{\"revision\":1}", "Previous version backup");
    try { await storage.SaveAsync(Request("{\"revision\":3}", true), default); throw new Exception("Create overwrite accepted"); }
    catch (IOException) { }
    using var cancelled = new CancellationTokenSource(); cancelled.Cancel();
    try { await storage.SaveAsync(Request("{\"revision\":4}"), cancelled.Token); throw new Exception("Cancelled save accepted"); }
    catch (OperationCanceledException) { }
    Check(await storage.LoadAsync("test", default) == "{\"revision\":2}", "Cancelled save changed original");
    try { await storage.SaveAsync(Request("{\"large\":\"" + new string('x', ProjectStorageService.MaximumDocumentBytes) + "\"}"), default); throw new Exception("Oversized save accepted"); }
    catch (InvalidOperationException) { }
    Check(await storage.LoadAsync("test", default) == "{\"revision\":2}", "Oversized save changed original");
    using (var locked = new FileStream(Path.Combine(directory, "test.cweb"), FileMode.Open, FileAccess.Read, FileShare.Read))
    {
        try { await storage.SaveAsync(Request("{\"revision\":5}"), default); throw new Exception("Locked replacement accepted"); }
        catch (IOException) { }
    }
    Check(await storage.LoadAsync("test", default) == "{\"revision\":2}", "Failed replacement changed original");
    await Task.WhenAll(Enumerable.Range(10, 10).Select(i => storage.SaveAsync(Request($"{{\"revision\":{i}}}"), default)));
    using var current = System.Text.Json.JsonDocument.Parse((await storage.LoadAsync("test", default))!);
    using var backup = System.Text.Json.JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(directory, "test.cweb.bak")));
    Check(!Directory.EnumerateFiles(directory, "*.tmp").Any(), "Temporary file leak");
    Console.WriteLine("PASS: atomic replacement, backup, conflict, cancellation, failure, document size and concurrent saves.");
}
finally { if (!Path.GetFullPath(directory).StartsWith(Path.GetFullPath(Path.GetTempPath()) + "comfile-storage-", StringComparison.OrdinalIgnoreCase)) throw new Exception("Unexpected cleanup path"); Directory.Delete(directory, true); }
