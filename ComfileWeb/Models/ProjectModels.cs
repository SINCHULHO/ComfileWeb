using System.Text.Json;

namespace ComfileWeb.Models;

/// <summary>
/// 브라우저 디자이너가 보내는 프로젝트 저장 요청.
/// DocumentText 를 우선 사용해 JSON 원문을 그대로 저장한다.
/// </summary>
public sealed class ProjectSaveRequest
{
    public string Name { get; init; } = string.Empty;
    public string? DocumentText { get; init; }
    public JsonElement? Document { get; init; }
}

/// <summary>
/// 프로젝트 저장 결과.
/// </summary>
public sealed record ProjectSaveResult(string Name, string FileName, string FullPath, DateTimeOffset SavedAt);

/// <summary>
/// 저장된 프로젝트 목록의 한 항목.
/// </summary>
public sealed record ProjectListItem(string Name, string FileName, long SizeBytes, DateTimeOffset ModifiedAt, string FullPath);
