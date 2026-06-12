using System.Text.Json;
using System.Runtime.InteropServices;
using ComfileTech.Cfnet.Cfheader;
using ComfileWeb.Models;
using ComfileWeb.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ProjectStorageService>();
builder.Services.AddSingleton<UsbCdcService>();
builder.Services.AddSingleton<VisualizationRuntimeService>();

var app = builder.Build();

app.UseWebSockets();
app.UseDefaultFiles();
app.UseStaticFiles();

var projectApi = app.MapGroup("/api/project");
var usbApi = app.MapGroup("/api/usb-cdc");
var cfnetApi = app.MapGroup("/api/cfnet");
var cfnetSync = new object();

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

    ProjectSaveResult result = await storage.SaveAsync(request, cancellationToken);
    return Results.Ok(result);
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

cfnetApi.MapGet("/status", (ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        EnsureCfnetNativeLibraries(logger);
        try
        {
            if (Cfheader.Instances.Count == 0)
            {
                return Results.Ok(new
                {
                    isConnected = false,
                    detail = "CFHEADER instance not found."
                });
            }

            var cfheader0 = Cfheader.Instances[0];
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

cfnetApi.MapPost("/connect", (ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        EnsureCfnetNativeLibraries(logger);
        try
        {
            if (Cfheader.Instances.Count == 0)
            {
                return Results.BadRequest(new { detail = "CFHEADER instance not found." });
            }

            var cfheader0 = Cfheader.Instances[0];
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

cfnetApi.MapPost("/disconnect", (ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        EnsureCfnetNativeLibraries(logger);
        try
        {
            if (Cfheader.Instances.Count == 0)
            {
                return Results.Ok(new
                {
                    isConnected = false,
                    detail = "CFHEADER instance not found."
                });
            }

            var cfheader0 = Cfheader.Instances[0];
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

TryTurnOnCfdo0Port0AtStartup(app.Logger);

app.Run();

static void TryTurnOnCfdo0Port0AtStartup(ILogger logger)
{
    EnsureCfnetNativeLibraries(logger);

    try
    {
        var cfheader0 = Cfheader.Instances[0];
        var cfdo0 = cfheader0.DigitalOutputModules[0];

        cfheader0.Open();
        cfdo0.Channels[0].State = true;
        cfheader0.Sync();

        logger.LogInformation("CFDO[0] Port[0] ON completed at startup.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Startup CFDO[0] Port[0] ON failed.");
    }
}

static void EnsureCfnetNativeLibraries(ILogger logger)
{
    try
    {
        var nativeDirectory = Path.Combine(AppContext.BaseDirectory, "runtimes", "win-x64", "native");
        if (!Directory.Exists(nativeDirectory))
        {
            return;
        }

        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        if (!path.Split(';', StringSplitOptions.RemoveEmptyEntries)
                 .Any(entry => string.Equals(entry.Trim(), nativeDirectory, StringComparison.OrdinalIgnoreCase)))
        {
            Environment.SetEnvironmentVariable("PATH", nativeDirectory + ";" + path);
        }

        NativeLibrary.Load(Path.Combine(nativeDirectory, "libusb-1.0.dll"));
        NativeLibrary.Load(Path.Combine(nativeDirectory, "ComfileTech.Cfnet.Cfheader.Native.dll"));
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Cfnet native library preload failed.");
    }
}
