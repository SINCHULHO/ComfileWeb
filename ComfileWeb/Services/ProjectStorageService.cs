using System.Text;
using System.Text.Json;
using ComfileWeb.Models;

namespace ComfileWeb.Services;

/// <summary>
/// 디자이너 프로젝트(.cweb JSON)를 로컬 디스크에 저장/로드/열거한다.
/// 기본 저장 위치: %USERPROFILE%\Documents\ComfileWeb\Projects
/// </summary>
public sealed class ProjectStorageService
{
    private const string ProjectExtension = ".cweb";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true
    };

    public ProjectStorageService(IConfiguration configuration)
    {
        string? configured = configuration["ComfileWeb:ProjectsDirectory"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            ProjectsDirectory = Environment.ExpandEnvironmentVariables(configured);
        }
        else
        {
            string documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            ProjectsDirectory = Path.Combine(documents, "ComfileWeb", "Projects");
        }

        Directory.CreateDirectory(ProjectsDirectory);
    }

    public string ProjectsDirectory { get; }

    public async Task<ProjectSaveResult> SaveAsync(ProjectSaveRequest request, CancellationToken cancellationToken)
    {
        string safeName = NormalizeProjectName(request.Name);
        string fileName = safeName + ProjectExtension;
        string fullPath = Path.Combine(ProjectsDirectory, fileName);

        string json = BuildJsonText(request);
        await File.WriteAllTextAsync(fullPath, json, new UTF8Encoding(false), cancellationToken);

        DateTimeOffset savedAt = File.GetLastWriteTime(fullPath);
        return new ProjectSaveResult(safeName, fileName, fullPath, savedAt);
    }

    private static string BuildJsonText(ProjectSaveRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.DocumentText))
        {
            using JsonDocument parsed = JsonDocument.Parse(request.DocumentText);
            return parsed.RootElement.GetRawText();
        }

        if (request.Document is JsonElement element && element.ValueKind != JsonValueKind.Undefined)
        {
            return JsonSerializer.Serialize(element, SerializerOptions);
        }

        throw new InvalidOperationException("Document JSON is required.");
    }

    public async Task<string?> LoadAsync(string name, CancellationToken cancellationToken)
    {
        string safeName = NormalizeProjectName(name);
        string fullPath = Path.Combine(ProjectsDirectory, safeName + ProjectExtension);
        if (!File.Exists(fullPath))
        {
            return null;
        }

        return await File.ReadAllTextAsync(fullPath, cancellationToken);
    }

    public IReadOnlyList<ProjectListItem> List()
    {
        var directory = new DirectoryInfo(ProjectsDirectory);
        if (!directory.Exists)
        {
            return Array.Empty<ProjectListItem>();
        }

        return directory
            .EnumerateFiles("*" + ProjectExtension, SearchOption.TopDirectoryOnly)
            .OrderByDescending(file => file.LastWriteTime)
            .Select(file => new ProjectListItem(
                Path.GetFileNameWithoutExtension(file.Name),
                file.Name,
                file.Length,
                file.LastWriteTime,
                file.FullName))
            .ToList();
    }

    /// <summary>
    /// 경로 조작/유효하지 않은 문자를 제거해 안전한 파일명만 허용한다.
    /// </summary>
    private static string NormalizeProjectName(string? name)
    {
        string trimmed = (name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            trimmed = "Untitled";
        }

        // 경로 구분자 및 상위 디렉터리 참조 차단
        trimmed = trimmed.Replace('\\', '_').Replace('/', '_');

        var builder = new StringBuilder(trimmed.Length);
        char[] invalidChars = Path.GetInvalidFileNameChars();
        foreach (char ch in trimmed)
        {
            builder.Append(Array.IndexOf(invalidChars, ch) >= 0 ? '_' : ch);
        }

        string result = builder.ToString().Trim().TrimEnd('.');
        return string.IsNullOrEmpty(result) ? "Untitled" : result;
    }
}
