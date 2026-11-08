Option Strict On

Imports System.IO
Imports System.Text.Json
Imports System.Text.RegularExpressions

' Only transport diagnostics, never request/response bodies, images or HTTP headers.
Public NotInheritable Class UserReportTransportLog
    Private Shared ReadOnly gate As New Object()
    Private Shared ReadOnly entries As New List(Of Object)
    Private Shared ReadOnly logPath As String = Path.Combine(UserReport.Folder, "transport-last.json")

    Public Shared Sub BeginAttempt()
        SyncLock gate
            entries.Clear()
            Record("prepare")
        End SyncLock
    End Sub

    Public Shared Sub Record(stage As String, Optional status As Integer? = Nothing, Optional failure As Exception = Nothing)
        SyncLock gate
            Try
                Dim detail As String = Nothing
                If failure IsNot Nothing Then
                    ' ToString includes exception types, full messages, inner exceptions and stack traces.
                    detail = UserReport.CleanDiagnostic(failure.ToString(), Integer.MaxValue)
                    detail = Regex.Replace(detail, "(?i)\b(Bearer|Basic)\s+[A-Za-z0-9+/=._-]+", "$1 [removed]", RegexOptions.None, TimeSpan.FromMilliseconds(200))
                    detail = Regex.Replace(detail, "(?i)(https?://)[^\s/@]+:[^\s/@]+@", "$1[credentials removed]@", RegexOptions.None, TimeSpan.FromMilliseconds(200))
                End If
                entries.Add(New With {.utc = DateTimeOffset.UtcNow, .stage = stage, .http_status = status, .exception = detail})
                If entries.Count > 30 Then entries.RemoveAt(0)
                Directory.CreateDirectory(UserReport.Folder)
                UserReport.AtomicWrite(logPath, Snapshot())
            Catch
                ' Diagnostic storage must not change the report result.
            End Try
        End SyncLock
    End Sub

    Private Shared Function Snapshot() As String
        Return JsonSerializer.Serialize(New With {
            .url = UserReportSender.Endpoint, .method = "POST", .user_agent = UserReportSender.UserAgent, .content_type = "multipart/form-data",
            .metadata_field = "metadata", .image_field = "images[]", .product = "comfileweb",
            .entries = entries}, New JsonSerializerOptions With {.WriteIndented = True, .Encoder = UserReport.JsonOptions.Encoder})
    End Function

    Public Shared Function ReadText() As String
        SyncLock gate
            If entries.Count > 0 Then Return Snapshot()
            If File.Exists(logPath) AndAlso New FileInfo(logPath).Length <= 1024 * 1024 Then Return File.ReadAllText(logPath)
            Return "No recorded send attempt. / 기록된 전송 시도가 없습니다."
        End SyncLock
    End Function
End Class
