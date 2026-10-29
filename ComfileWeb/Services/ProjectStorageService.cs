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
    private readonly object _sync = new();
    private readonly SemaphoreSlim _saveLock = new(1, 1);
    public const int MaximumDocumentBytes = 16 * 1024 * 1024;
    private string _projectsDirectory;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true
    };

    public ProjectStorageService(IConfiguration configuration)
    {
        string? configured = configuration["ComfileWeb:ProjectsDirectory"];
        string resolvedPath;
        if (!string.IsNullOrWhiteSpace(configured))
        {
            resolvedPath = Environment.ExpandEnvironmentVariables(configured);
        }
        else
        {
            string documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            resolvedPath = Path.Combine(documents, "ComfileWeb", "Projects");
        }

        _projectsDirectory = resolvedPath;
        Directory.CreateDirectory(_projectsDirectory);
    }

    public string ProjectsDirectory
    {
        get
        {
            lock (_sync)
            {
                return _projectsDirectory;
            }
        }
    }

    public void SetProjectsDirectory(string directoryPath)
    {
        string normalizedPath = Path.GetFullPath((directoryPath ?? string.Empty).Trim());
        if (string.IsNullOrWhiteSpace(normalizedPath))
        {
            throw new InvalidOperationException("Project directory path is required.");
        }

        Directory.CreateDirectory(normalizedPath);

        lock (_sync)
        {
            _projectsDirectory = normalizedPath;
        }
    }

    public async Task<ProjectSaveResult> SaveAsync(ProjectSaveRequest request, CancellationToken cancellationToken)
    {
        string safeName = NormalizeProjectName(request.Name);
        string fileName = safeName + ProjectExtension;
        string fullPath = Path.Combine(ProjectsDirectory, fileName);

        string json = BuildJsonText(request);
        if (Encoding.UTF8.GetByteCount(json) > MaximumDocumentBytes)
            throw new InvalidOperationException("Project exceeds the 16 MiB document limit.");
        var temporary = fullPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        await _saveLock.WaitAsync(cancellationToken);
        try
        {
            // 같은 디스크에 완성된 임시 파일을 만든 뒤 원자적으로 교체한다.
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, true))
            {
                var bytes = Encoding.UTF8.GetBytes(json);
                await stream.WriteAsync(bytes, cancellationToken);
                await stream.FlushAsync(cancellationToken);
                stream.Flush(flushToDisk: true);
            }
            cancellationToken.ThrowIfCancellationRequested();
            if (!request.FailIfExists && File.Exists(fullPath))
                File.Replace(temporary, fullPath, fullPath + ".bak");
            else
                File.Move(temporary, fullPath, overwrite: false);
        }
        finally
        {
            try { if (File.Exists(temporary)) File.Delete(temporary); }
            finally { _saveLock.Release(); }
        }

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
