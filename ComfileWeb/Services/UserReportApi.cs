using System.Net;
using System.Text.Json;
using ComfileWeb.Reporting;
namespace ComfileWeb.Services;

public static class UserReportApi
{
    static readonly SemaphoreSlim gate = new(1, 1);
    static object View(UserReport report)
    {
        using var document = JsonDocument.Parse(report.Metadata);
        return new { id = report.Id, kind = report.Kind, metadata = document.RootElement.Clone(), images = report.Images.Select(p => new { mime = p.Mime, data = Convert.ToBase64String(p.Bytes) }), blocked = report.Blocked, retryAt = report.RetryAt };
    }
    static UserReport? Find(string id) => Guid.TryParse(id, out var guid) ? UserReport.Pending().FirstOrDefault(r => r.Id == guid.ToString("D")) : null;
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/reports");
        group.AddEndpointFilter(async (context, next) => {
            var http = context.HttpContext;
            http.Response.Headers.CacheControl = "no-store";
            if (http.Connection.RemoteIpAddress is not { } ip || !IPAddress.IsLoopback(ip)) return Results.StatusCode(403);
            if (http.Request.Method != "GET" && (http.Request.Headers.Origin != $"{http.Request.Scheme}://{http.Request.Host}" || http.Request.Headers["X-Comfile-Update-Token"] != http.RequestServices.GetRequiredService<AppUpdateService>().Token)) return Results.StatusCode(403);
            if (!await gate.WaitAsync(0, http.RequestAborted)) return Results.Conflict(new { detail = "다른 보고 작업이 진행 중입니다. / Another report operation is in progress." });
            try { return await next(context); }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException or ArgumentException or InvalidOperationException) { return Results.BadRequest(new { detail = "보고 자료를 처리할 수 없습니다. 내용과 파일 크기를 확인하세요. / Unable to process report." }); }
            finally { gate.Release(); }
        });
        group.MapGet("", () => Results.Ok(UserReport.Pending().Select(r => new { id = r.Id, kind = r.Kind, blocked = r.Blocked })));
        group.MapGet("/{id}", (string id) => Find(id) is { } report ? Results.Ok(View(report)) : Results.NotFound());
        group.MapPost("", async (HttpContext context) => {
            if (context.Request.ContentLength is > 16777216) return Results.StatusCode(413);
            if (!context.Request.HasFormContentType) return Results.BadRequest();
            var form = await context.Request.ReadFormAsync(new Microsoft.AspNetCore.Http.Features.FormOptions { MultipartBodyLengthLimit = 16777216, ValueLengthLimit = 10000, MultipartHeadersLengthLimit = 4096 }, context.RequestAborted);
            if (form.Files.Count > 3) return Results.BadRequest();
            var images = new List<ReportImage>();
            foreach (var file in form.Files) {
                if (file.Name != "images[]" || file.Length > 5242880) return Results.BadRequest();
                using var stream = new MemoryStream();
                await file.CopyToAsync(stream, context.RequestAborted);
                images.Add(new ReportImage { Bytes = stream.ToArray(), Mime = file.ContentType });
            }
            var report = UserReport.Create(form["kind"].ToString(), form["description"].ToString(), images);
            // Saving a new draft never sends it. A lost response cannot create a duplicate submission.
            report.Save();
            return Results.Ok(View(report));
        }).DisableAntiforgery();
        group.MapPost("/{id}/send", async (string id, HttpContext context) => {
            var report = Find(id);
            if (report is null) return Results.NotFound();
            var result = await UserReportSender.SendAsync(report, context.Request.Headers["X-Report-Language"] != "en", context.RequestAborted);
            return Results.Ok(new { accepted = result.Accepted, message = result.Message, blocked = report.Blocked, retryAt = report.RetryAt });
        });
        group.MapDelete("/{id}", (string id) => { var report = Find(id); if (report is null) return Results.NotFound(); report.Remove(); return Results.Ok(); });
    }
}
