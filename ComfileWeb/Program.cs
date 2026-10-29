using System.Text.Json;
using System.Diagnostics;
using System.Runtime.InteropServices;
using ComfileTech.Cfnet.Cfheader;
using ComfileWeb.Models;
using ComfileWeb.Services;

if (args.Contains("--mcp", StringComparer.Ordinal))
{
    await McpStdioServer.RunAsync();
    return;
}

// 이전 서버가 정상 종료된 뒤 새 버전을 시작하여 포트 충돌을 막는다.
var waitIndex = Array.IndexOf(args, "--wait-for-process");
if (waitIndex >= 0)
{
    if (waitIndex + 1 >= args.Length || !int.TryParse(args[waitIndex + 1], out var oldPid)) return;
    try
    {
        using var oldProcess = Process.GetProcessById(oldPid);
        await oldProcess.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(60));
    }
    catch (ArgumentException) { }
    args = args.Where((_, index) => index != waitIndex && index != waitIndex + 1).ToArray();
}

// 테스트와 백그라운드 실행에서만 브라우저 자동 열기를 명시적으로 끈다.
var openBrowser = !args.Contains("--no-browser", StringComparer.Ordinal);
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args.Where(arg => arg != "--no-browser").ToArray(),
    // 실행 위치가 달라도 게시된 웹 파일은 실행 파일 옆에서 찾는다.
    ContentRootPath = Directory.Exists(Path.Combine(AppContext.BaseDirectory, "wwwroot")) ? AppContext.BaseDirectory : null
});
var browserUrl = BrowserStartup.GetBrowserUrl(builder.Configuration["urls"]);
var existingVersion = openBrowser ? await BrowserStartup.GetExistingVersionAsync(browserUrl) : null;
if (existingVersion is not null)
{
    if (System.Version.TryParse(existingVersion, out var existing) && existing < System.Version.Parse(AppUpdateService.CurrentVersion))
    {
        AppUpdateService.Queue(browserUrl);
        if (!await BrowserStartup.SupportsUpdateAsync(browserUrl)) BrowserStartup.ShowLegacyUpdateNotice(existingVersion, AppUpdateService.CurrentVersion);
        Console.WriteLine($"Update available: {existingVersion} -> {AppUpdateService.CurrentVersion}. Save your work and select Save and update in the browser.");
    }
    BrowserStartup.Open(browserUrl);
    return;
}
// 명시된 주소를 우선하며, 설치본에는 개발용 HTTPS 인증서를 요구하지 않는다.
if (string.IsNullOrWhiteSpace(builder.Configuration["urls"]))
{
    builder.WebHost.UseUrls(builder.Environment.IsDevelopment()
        ? ["http://0.0.0.0:5000", "https://localhost:7261"]
        : ["http://0.0.0.0:5000"]);
}
builder.Services.AddSingleton<ProjectStorageService>();
builder.Services.AddSingleton<UsbCdcService>();
builder.Services.AddSingleton<VisualizationRuntimeService>();
builder.Services.AddSingleton<McpEditorBridge>();
builder.Services.AddSingleton<AppUpdateService>();
builder.Services.AddSingleton<CodexSetupService>();
builder.Services.AddHostedService<McpPipeService>();

var app = builder.Build();

app.UseWebSockets();
app.UseDefaultFiles();
// 최초 화면 언어는 서버 PC의 Windows 표시 언어를 사용한다.
app.MapGet("/api/ui-language.js", (HttpContext context) =>
{
    context.Response.Headers.CacheControl = "no-store";
    var culture = System.Globalization.CultureInfo.CurrentUICulture;
    var mode = culture.TwoLetterISOLanguageName == "ko" ? "ko" : "en";
    return Results.Text($"window.comfileWebSystemLanguage = '{mode}';", "application/javascript");
});
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // 앱 업데이트 후 이전 스크립트와 스타일이 섞이지 않도록 매번 재검증한다.
        var extension = Path.GetExtension(context.File.Name);
        if (extension is ".html" or ".css" or ".js")
            context.Context.Response.Headers.CacheControl = "no-cache";
    }
});
app.Map("/mcp/editor", async (HttpContext context, McpEditorBridge bridge) =>
{
    // 로컬 브라우저의 동일 출처 연결만 편집 채널로 허용한다.
    var remote = context.Connection.RemoteIpAddress;
    var expectedOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
    if (remote is null || !System.Net.IPAddress.IsLoopback(remote)
        || !string.Equals(context.Request.Headers.Origin, expectedOrigin, StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = 403;
        return;
    }
    if (!context.WebSockets.IsWebSocketRequest) { context.Response.StatusCode = 400; return; }
    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    await bridge.HandleAsync(socket, context.RequestAborted);
});

// About 화면도 빌드된 실행 파일의 버전을 사용한다.
app.MapGet("/api/version", (HttpContext context) =>
{
    context.Response.Headers.CacheControl = "no-store";
    string version = typeof(Program).Assembly
        .GetCustomAttributes(typeof(System.Reflection.AssemblyInformationalVersionAttribute), false)
        .OfType<System.Reflection.AssemblyInformationalVersionAttribute>()
        .Single().InformationalVersion.Split('+')[0];
    return Results.Ok(new { version });
});

// 재시작 요청은 로컬 화면과 이번 실행에만 유효한 토큰으로 제한한다.
app.MapGet("/api/app/update", (HttpContext context, AppUpdateService updates) =>
{
    context.Response.Headers.CacheControl = "no-store";
    if (context.Connection.RemoteIpAddress is not { } ip || !System.Net.IPAddress.IsLoopback(ip)) return Results.StatusCode(403);
    var pending = updates.Read(browserUrl);
    return Results.Ok(new { currentVersion = AppUpdateService.CurrentVersion, availableVersion = pending?.Version, token = updates.Token });
});
app.MapPost("/api/app/update", async (HttpContext context, AppUpdateService updates, McpEditorBridge bridge, VisualizationRuntimeService runtime) =>
{
    if (context.Connection.RemoteIpAddress is not { } ip || !System.Net.IPAddress.IsLoopback(ip)
        || context.Request.Headers.Origin != $"{context.Request.Scheme}://{context.Request.Host}"
        || context.Request.Headers["X-Comfile-Update-Token"] != updates.Token) return Results.StatusCode(403);
    if (!await updates.Gate.WaitAsync(0)) return Results.Conflict(new { detail = "Update already in progress." });
    var restartScheduled = false;
    try
    {
        var pending = updates.Read(browserUrl);
        if (pending is null) return Results.Conflict(new { detail = "No newer build is available." });
        if (!runtime.BeginUpdate()) return Results.Conflict(new { code = "RUNTIME_ACTIVE", detail = "Stop runtime before updating." });
        var discardUnsaved = context.Request.Headers["X-Comfile-Discard-Unsaved"] == "true";
        var blockedEditor = await bridge.LockForUpdateAsync(context.RequestAborted, discardUnsaved);
        if (blockedEditor is not null) return Results.Conflict(blockedEditor);
        if (runtime.IsRunning) return Results.Conflict(new { detail = "Runtime started. Stop it before updating." });
        updates.Start(pending);
        restartScheduled = true;
        _ = Task.Run(async () => { await Task.Delay(1000); bridge.DisconnectForUpdate(); app.Lifetime.StopApplication(); });
        return Results.Ok(new { restarting = true, version = pending.Version });
    }
    finally
    {
        if (!restartScheduled) { runtime.CancelUpdate(); await bridge.UnlockAfterUpdateAsync(); }
        updates.Gate.Release();
    }
});

// Codex 설정 변경은 이 PC의 동일 출처 화면에서 명시적으로 요청한 경우만 허용한다.
app.MapPost("/api/ai/codex/setup", (HttpContext context, AppUpdateService updates, CodexSetupService setup) =>
{
    if (context.Connection.RemoteIpAddress is not { } ip || !System.Net.IPAddress.IsLoopback(ip)
        || context.Request.Headers.Origin != $"{context.Request.Scheme}://{context.Request.Host}"
        || context.Request.Headers["X-Comfile-Update-Token"] != updates.Token) return Results.StatusCode(403);
    try
    {
        setup.Install(CodexSetupService.ConfigPath, CodexSetupService.Executable, Environment.GetEnvironmentVariable("COMFILEWEB_MCP_INSTANCE"));
        return Results.Ok(new { configured = true });
    }
    catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidOperationException or ArgumentException or Tomlyn.TomlException)
    {
        return Results.BadRequest(new { configured = false });
    }
});

var projectApi = app.MapGroup("/api/project");
var usbApi = app.MapGroup("/api/usb-cdc");
var cfnetApi = app.MapGroup("/api/cfnet");
var cfnetSync = CfnetMcpAccess.SyncRoot;

projectApi.MapGet("/settings", (ProjectStorageService storage) =>
    Results.Ok(new
    {
        projectsDirectory = storage.ProjectsDirectory
    }));

projectApi.MapPost("/settings", (ProjectSettingsUpdateRequest request, ProjectStorageService storage) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.ProjectsDirectory))
    {
        return Results.BadRequest(new { detail = "Projects directory path is required." });
    }

    try
    {
        storage.SetProjectsDirectory(request.ProjectsDirectory);
        return Results.Ok(new
        {
            projectsDirectory = storage.ProjectsDirectory
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { detail = ex.Message });
    }
});

app.MapPost("/runtimeHub/negotiate", () =>
{
    string connectionId = Guid.NewGuid().ToString("N");
    return Results.Json(new
    {
        connectionId,
        connectionToken = connectionId,
        availableTransports = new[]
        {
            new
            {
                transport = "WebSockets",
                transferFormats = new[] { "Text" }
            }
        }
    });
});

app.Map("/runtimeHub", async (HttpContext context, VisualizationRuntimeService runtimeService) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
    await runtimeService.HandleWebSocketAsync(webSocket, context.RequestAborted);
});

projectApi.MapGet("/list", (ProjectStorageService storage) =>
    Results.Ok(storage.List()));

projectApi.MapGet("/load", async (string name, ProjectStorageService storage, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(name))
    {
        return Results.BadRequest(new { detail = "Project name is required." });
    }

    string? json = await storage.LoadAsync(name, cancellationToken);
    return json is null
        ? Results.NotFound(new { detail = $"Project '{name}' was not found." })
        : Results.Content(json, "application/json");
});

projectApi.MapPost("/save", async (ProjectSaveRequest request, ProjectStorageService storage, CancellationToken cancellationToken) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { detail = "Project name is required." });
    }

    if (string.IsNullOrWhiteSpace(request.DocumentText)
        && (request.Document is null || request.Document.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null))
    {
        return Results.BadRequest(new { detail = "Project document JSON is required." });
    }

    try
    {
        ProjectSaveResult result = await storage.SaveAsync(request, cancellationToken);
        return Results.Ok(result);
    }
    catch (IOException ex) when (request.FailIfExists)
    {
        return Results.Conflict(new { detail = ex.Message });
    }
    catch (InvalidOperationException ex) { return Results.BadRequest(new { detail = ex.Message }); }
    catch (JsonException ex) { return Results.BadRequest(new { detail = ex.Message }); }
});

usbApi.MapGet("/ports", (UsbCdcService usbCdc) =>
    Results.Ok(new
    {
        ports = usbCdc.GetAvailablePorts(),
        portInfos = usbCdc.GetAvailablePortInfos(),
        isConnected = usbCdc.IsConnected,
        portName = usbCdc.ConnectedPortName
    }));

usbApi.MapPost("/connect", (UsbCdcConnectRequest request, UsbCdcService usbCdc) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.PortName))
    {
        return Results.BadRequest(new { detail = "Port name is required." });
    }

    int baudRate = request.BaudRate is > 0 ? request.BaudRate.Value : 115200;

    try
    {
        bool connected = usbCdc.Connect(request.PortName, baudRate);
        if (!connected)
        {
            return Results.BadRequest(new { detail = "Unable to open selected USB-CDC port." });
        }

        return Results.Ok(new
        {
            isConnected = usbCdc.IsConnected,
            portName = usbCdc.ConnectedPortName,
            baudRate
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { detail = ex.Message });
    }
});

usbApi.MapPost("/test", (UsbCdcConnectRequest request, UsbCdcService usbCdc) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.PortName))
    {
        return Results.BadRequest(new { detail = "Port name is required." });
    }

    int baudRate = request.BaudRate is > 0 ? request.BaudRate.Value : 115200;

    try
    {
        bool ok = usbCdc.Test(request.PortName, baudRate);
        if (!ok)
        {
            return Results.BadRequest(new { detail = "Unable to open selected USB-CDC port." });
        }

        return Results.Ok(new
        {
            ok,
            isConnected = usbCdc.IsConnected,
            portName = request.PortName,
            baudRate
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { detail = ex.Message });
    }
});

usbApi.MapPost("/disconnect", (UsbCdcService usbCdc) =>
{
    usbCdc.Disconnect();
    return Results.Ok(new
    {
        isConnected = usbCdc.IsConnected,
        portName = usbCdc.ConnectedPortName
    });
});

cfnetApi.MapGet("/status", (int? address, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        CfnetMcpAccess.EnsureNativeLibraries(logger);
        try
        {
            var cfheader0 = GetCfheader(address);
            return Results.Ok(new
            {
                isConnected = cfheader0.IsOpen,
                address = cfheader0.Address
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CFNET status check failed.");
            return Results.Ok(new
            {
                isConnected = false,
                detail = ex.Message
            });
        }
    }
});

cfnetApi.MapPost("/connect", (CfnetAddressRequest? request, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        CfnetMcpAccess.EnsureNativeLibraries(logger);
        try
        {
            var cfheader0 = GetCfheader(request?.Address);
            if (!cfheader0.IsOpen)
            {
                cfheader0.Open();
            }

            return Results.Ok(new
            {
                isConnected = cfheader0.IsOpen,
                address = cfheader0.Address
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CFNET connect failed.");
            return Results.BadRequest(new { detail = ex.Message });
        }
    }
});

cfnetApi.MapPost("/scan-modules", (CfnetAddressRequest? request, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        CfnetMcpAccess.EnsureNativeLibraries(logger);
        try
        {
            var cfheader0 = GetCfheader(request?.Address);
            if (!cfheader0.IsOpen)
            {
                cfheader0.Open();
            }

            var allIOModules = ((IEnumerable<IIOModule>)cfheader0.AnalogInputModules)
                .Concat(cfheader0.AnalogOutputModules)
                .Concat(cfheader0.DigitalInputModules)
                .Concat(cfheader0.DigitalOutputModules)
                .ToArray();

            foreach (var ioModule in allIOModules)
            {
                ioModule.AcknowledgeI2cFailure();
            }

            cfheader0.Sync();

            var modules = allIOModules
                .Where(ioModule => ioModule.I2cStatus == I2cResult.Success)
                .Select(ioModule => new
                {
                    type = ioModule.GetType().Name,
                    address = ioModule.Address
                })
                .OrderBy(module => module.address)
                .ThenBy(module => module.type)
                .ToArray();

            return Results.Ok(new
            {
                isConnected = cfheader0.IsOpen,
                address = cfheader0.Address,
                modules
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CFNET module scan failed.");
            return Results.BadRequest(new { detail = ex.Message });
        }
    }
});

cfnetApi.MapPost("/disconnect", (CfnetAddressRequest? request, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        CfnetMcpAccess.EnsureNativeLibraries(logger);
        try
        {
            var cfheader0 = GetCfheader(request?.Address);
            if (cfheader0.IsOpen)
            {
                cfheader0.Close();
            }

            return Results.Ok(new
            {
                isConnected = cfheader0.IsOpen,
                address = cfheader0.Address
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CFNET disconnect failed.");
            return Results.BadRequest(new { detail = ex.Message });
        }
    }
});

// 개발 환경에서도 실행 파일 자체가 브라우저를 열며, IDE의 중복 열기는 끈다.
if (openBrowser)
{
    app.Lifetime.ApplicationStarted.Register(() => BrowserStartup.Open(browserUrl));
}

app.Run();

static Cfheader GetCfheader(int? requestedAddress)
{
    int address = requestedAddress is >= 0 and <= 7 ? requestedAddress.Value : 0;
    if (Cfheader.Instances.Count <= address)
    {
        throw new InvalidOperationException($"CFHEADER address {address} is not available.");
    }

    return Cfheader.Instances[address];
}

sealed class CfnetAddressRequest
{
    public int? Address { get; set; }
}
