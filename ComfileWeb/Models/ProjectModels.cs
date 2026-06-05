using System.Text.Json;

namespace ComfileWeb.Models;

/// <summary>
/// 브라우저 디자이너가 보내는 프로젝트 저장 요청.
/// Document 는 visualization.js 의 documentModel(JSON) 을 그대로 담는다.
/// </summary>
public sealed record ProjectSaveRequest(string Name, JsonElement Document);

/// <summary>
/// 프로젝트 저장 결과.
/// </summary>
public sealed record ProjectSaveResult(string Name, string FileName, string FullPath, DateTimeOffset SavedAt);

/// <summary>
/// 저장된 프로젝트 목록의 한 항목.
/// </summary>
public sealed record ProjectListItem(string Name, string FileName, long SizeBytes, DateTimeOffset ModifiedAt);
