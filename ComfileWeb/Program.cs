using ComfileWeb.Models;
using ComfileWeb.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ProjectStorageService>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var projectApi = app.MapGroup("/api/project");

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

    ProjectSaveResult result = await storage.SaveAsync(request, cancellationToken);
    return Results.Ok(result);
});

app.Run();
