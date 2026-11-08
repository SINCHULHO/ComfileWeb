using System.Net;
using System.Text.Json;
using ComfileWeb.Services;

static string Feed(params object[] files) => JsonSerializer.Serialize(new { product = "ComfileWEB", files });
static object FileEntry(string v, bool legacy = false, string? name = null) => new { name = name ?? $"ComfileWEB-Setup-{v}-win-x64.exe", version = v, legacy };
static void Check(bool condition) { if (!condition) throw new Exception("Update check assertion failed"); }
var feed = Feed(FileEntry("0.9.999"), FileEntry("0.9.2000"), FileEntry("0.10.1"), FileEntry("1.0.1", true), FileEntry("9.0.1", name: "OtherProduct.exe"));
Check(DownloadUpdateService.FindNewerVersion(feed, "0.9.1940") == "0.10.1");
Check(DownloadUpdateService.FindNewerVersion(feed, "0.10.1") == null);
Check(DownloadUpdateService.FindNewerVersion(feed, "1.0.0") == null);
Check(DownloadUpdateService.FindNewerVersion(Feed(FileEntry("1.0.1", name: "ComfileWEB-Setup-2.0.1-win-x64.exe")), "0.9.1940") == null);
Check(DownloadUpdateService.FindNewerVersion(feed.Replace("\"ComfileWEB\"", "\"Other\""), "0.9.1940") == null);
foreach (var body in new[] { feed, "invalid json", "[]", "{}" })
{
    var handler = new Handler(body);
    var service = new DownloadUpdateService("0.9.1940", handler);
    var results = await Task.WhenAll(service.CheckAsync(), service.CheckAsync());
    Check(handler.Calls == 1);
    Check(results.All(r => r == (body == feed ? "0.10.1" : null)));
}
foreach (var status in new[] { HttpStatusCode.NotFound, HttpStatusCode.Redirect, HttpStatusCode.InternalServerError })
    Check(await new DownloadUpdateService("0.9.1940", new Handler(feed, status)).CheckAsync() == null);
Check(await new DownloadUpdateService("0.9.1940", new Handler(feed, fail: true)).CheckAsync() == null);
Console.WriteLine("PASS: numeric order, product/installer validation, legacy exclusion, shared check, malformed responses and network errors");

sealed class Handler(string body, HttpStatusCode status = HttpStatusCode.OK, bool fail = false) : HttpMessageHandler
{
    public int Calls;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++;
        if (request.RequestUri!.AbsoluteUri != "https://comfilewiki.co.kr/downloads/api.php?product=comfileweb" ||
            request.Headers.UserAgent.ToString() != "ComfileWEB/0.9.1940") throw new Exception("Wrong request");
        if (fail) throw new HttpRequestException("Offline");
        return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body) });
    }
}
