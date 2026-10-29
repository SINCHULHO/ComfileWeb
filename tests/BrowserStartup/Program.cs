using ComfileWeb.Services;
using System.Net;
using System.Net.Sockets;
using System.Text;

void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}

Check(BrowserStartup.GetBrowserUrl(null) == "http://localhost:5000/", "Default URL");
Check(BrowserStartup.GetBrowserUrl("http://0.0.0.0:5017") == "http://localhost:5017/", "IPv4 wildcard");
Check(BrowserStartup.GetBrowserUrl("http://[::]:5017") == "http://localhost:5017/", "IPv6 wildcard");
Check(BrowserStartup.GetBrowserUrl("http://*:5017") == "http://localhost:5017/", "Host wildcard");
Check(BrowserStartup.GetBrowserUrl("https://localhost:7261;http://localhost:5017") == "http://localhost:5017/", "HTTP URL preference");

// 임시 포트에서 정상 앱과 다른 웹 서버를 구분하는지 확인한다.
using var listener = new TcpListener(IPAddress.Loopback, 0);
listener.Start();
var port = ((IPEndPoint)listener.LocalEndpoint).Port;
var responses = new[]
{
    "{\"version\":\"0.9.1931\"}",
    "<script>window.comfileWebEditorMode = true;</script><div id=\"designSurface\"></div>",
    "{\"version\":\"1.0\"}",
    "<html>Another application</html>",
    "not json"
};
var server = Task.Run(async () =>
{
    foreach (var response in responses)
    {
        using var connection = await listener.AcceptTcpClientAsync();
        using var stream = connection.GetStream();
        using var reader = new StreamReader(stream, leaveOpen: true);
        while (!string.IsNullOrEmpty(await reader.ReadLineAsync())) { }
        var body = Encoding.UTF8.GetBytes(response);
        await stream.WriteAsync(Encoding.ASCII.GetBytes($"HTTP/1.1 200 OK\r\nContent-Length: {body.Length}\r\nConnection: close\r\n\r\n"));
        await stream.WriteAsync(body);
    }
});
var url = $"http://127.0.0.1:{port}/";
Check(await BrowserStartup.IsExistingInstanceAsync(url), "Existing ComfileWEB detection");
Check(!await BrowserStartup.IsExistingInstanceAsync(url), "Unrelated server rejection");
Check(!await BrowserStartup.IsExistingInstanceAsync(url), "Invalid response rejection");
await server.WaitAsync(TimeSpan.FromSeconds(10));
listener.Stop();
Check(!await BrowserStartup.IsExistingInstanceAsync(url), "Stopped server handling");
Console.WriteLine("PASS: browser URL selection and existing-server detection.");

if (args.Length > 0)
{
    Check(await BrowserStartup.IsExistingInstanceAsync(args[0]), "Live server detection");
    Console.WriteLine("PASS: live server detection.");
}
