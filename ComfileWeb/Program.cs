using System.Text.Json;
using System.Diagnostics;
using System.Runtime.InteropServices;
using ComfileTech.Cfnet.Cfheader;
using ComfileWeb.Models;
using ComfileWeb.Services;

var builder = WebApplication.CreateBuilder(args);
// 외부 네트워크에서 접속 가능하도록 모든 인터페이스에 바인드
// 개발용 HTTPS 포트(launchSettings.json의 7261)도 함께 바인드하여
// Visual Studio가 기다리는 HTTPS 엔드포인트가 열리도록 함.
builder.WebHost.UseUrls("http://0.0.0.0:5000", "https://localhost:7261");
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

cfnetApi.MapGet("/status", (int? address, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("CfnetApi");
    lock (cfnetSync)
    {
        EnsureCfnetNativeLibraries(logger);
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
        EnsureCfnetNativeLibraries(logger);
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
        EnsureCfnetNativeLibraries(logger);
        try
        {
            var cfheader0 = GetCfheader(request?.Address);
            bool wasOpen = cfheader0.IsOpen;
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

            if (!wasOpen && cfheader0.IsOpen)
            {
                cfheader0.Close();
            }

            return Results.Ok(new
            {
                isConnected = true,
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
        EnsureCfnetNativeLibraries(logger);
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

const string applicationUrl = "http://localhost:5000";
// 앱은 UseUrls로 바인드 주소를 설정하므로 항상 Run()을 호출합니다.
// 비개발(프로덕션) 환경에서는 여전히 기본 브라우저를 열기 위해 applicationUrl을 사용합니다.
if (!app.Environment.IsDevelopment())
{
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = applicationUrl,
                UseShellExecute = true
            });
        }
        catch
        {
        }
    });
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

sealed class CfnetAddressRequest
{
    public int? Address { get; set; }
}
