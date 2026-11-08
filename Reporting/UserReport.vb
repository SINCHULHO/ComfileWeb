Option Strict On

Imports System.IO
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Text
Imports System.Text.Json
Imports System.Text.RegularExpressions
Imports System.Threading.Tasks

' Frozen before the first attempt: persisted JSON and image bytes are reused verbatim.
Public NotInheritable Class UserReport
    Public Property Metadata As String
    Public Property Images As New List(Of ReportImage)
    Public Property RetryAt As DateTimeOffset
    Public Property Blocked As Boolean
    Public Property Completed As Boolean

    Public Shared ReadOnly JsonOptions As New JsonSerializerOptions With {
        .Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping}
    ' Internal seam for isolated regression storage; production never overrides this path.
    Friend Shared Folder As String = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ComfileWeb", "Reports")

    Public ReadOnly Property Id As String
        Get
            Using doc = JsonDocument.Parse(Metadata)
                Return Guid.Parse(doc.RootElement.GetProperty("report_id").GetString()).ToString("D")
            End Using
        End Get
    End Property

    Public ReadOnly Property Kind As String
        Get
            Using doc = JsonDocument.Parse(Metadata)
                Return doc.RootElement.GetProperty("type").GetString()
            End Using
        End Get
    End Property

    Public Shared Function BaseMetadata(kind As String) As Dictionary(Of String, Object)
        Return New Dictionary(Of String, Object) From {
            {"schema_version", 1}, {"report_id", Guid.NewGuid().ToString("D")},
            {"product", "comfileweb"}, {"type", kind},
            {"version", Diagnostics.FileVersionInfo.GetVersionInfo(GetType(UserReport).Assembly.Location).ProductVersion},
            {"build", Diagnostics.FileVersionInfo.GetVersionInfo(GetType(UserReport).Assembly.Location).FileBuildPart.ToString(Globalization.CultureInfo.InvariantCulture)},
            {"environment", Environment.OSVersion.VersionString & "; .NET " & Environment.Version.ToString() & "; " & Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString()}}
    End Function

    Public Shared Function Create(kind As String, description As String, pictures As IEnumerable(Of ReportImage)) As UserReport
        If kind <> "bug" AndAlso kind <> "suggestion" Then Throw New ArgumentException("Invalid report type.")
        If String.IsNullOrWhiteSpace(description) OrElse Encoding.UTF8.GetByteCount(description) > 10000 Then
            Throw New InvalidDataException("설명은 필수이며 UTF-8 10,000바이트 이하여야 합니다. / Description is required (max. 10,000 UTF-8 bytes).")
        End If
        Dim data = BaseMetadata(kind)
        data.Add("description", description)
        data.Add("occurred_at", DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", Globalization.CultureInfo.InvariantCulture))
        Dim result As New UserReport With {.Metadata = JsonSerializer.Serialize(data, JsonOptions), .Images = pictures.ToList()}
        result.Validate()
        Return result
    End Function

    Public Sub Validate()
        If Kind <> "crash" AndAlso Kind <> "bug" AndAlso Kind <> "suggestion" Then Throw New InvalidDataException("Invalid report type.")
        If Encoding.UTF8.GetByteCount(Metadata) > 65536 Then Throw New InvalidDataException("Metadata exceeds 65,536 bytes.")
        If Images Is Nothing OrElse Images.Count > 3 OrElse (Kind = "crash" AndAlso Images.Count <> 0) Then Throw New InvalidDataException("Invalid image count.")
        For Each picture In Images
            picture.Validate()
        Next
    End Sub

    Public Sub Save()
        Directory.CreateDirectory(Folder)
        AtomicWrite(Path.Combine(Folder, Id & ".report.json"), JsonSerializer.Serialize(Me, JsonOptions))
    End Sub

    Public Shared Sub AtomicWrite(file As String, content As String)
        Dim temporary = file & ".tmp"
        Using stream As New FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None)
            Dim bytes = Encoding.UTF8.GetBytes(content)
            stream.Write(bytes, 0, bytes.Length)
            stream.Flush(True)
        End Using
        System.IO.File.Move(temporary, file, True)
    End Sub

    Public Sub Remove()
        File.Delete(Path.Combine(Folder, Id & ".report.json"))
    End Sub

    Public Function CorrectedCopy(description As String, pictures As IEnumerable(Of ReportImage)) As UserReport
        If Not Blocked Then Throw New InvalidOperationException("Only a definitively rejected report can be corrected.")
        If Kind <> "crash" Then Return Create(Kind, description, pictures)
        Using doc = JsonDocument.Parse(Metadata)
            Dim fields = doc.RootElement.EnumerateObject().ToDictionary(Function(p) p.Name, Function(p) p.Value.Clone())
            fields("report_id") = JsonSerializer.SerializeToElement(Guid.NewGuid().ToString("D"))
            Dim copy As New UserReport With {.Metadata = JsonSerializer.Serialize(fields, JsonOptions)}
            copy.Validate()
            Return copy
        End Using
    End Function

    Public Shared Iterator Function Pending() As IEnumerable(Of UserReport)
        If Not Directory.Exists(Folder) Then Return
        For Each reportPath In Directory.GetFiles(Folder, "*.report.json").OrderBy(Function(p) File.GetLastWriteTimeUtc(p))
            Dim candidate As UserReport = Nothing
            Try
                If New FileInfo(reportPath).Length > 23 * 1024 * 1024 Then Continue For
                Dim report = JsonSerializer.Deserialize(Of UserReport)(File.ReadAllText(reportPath))
                If report IsNot Nothing AndAlso Not report.Completed Then
                    report.Validate()
                    candidate = report
                End If
            Catch ex As Exception When TypeOf ex Is IOException OrElse TypeOf ex Is JsonException OrElse TypeOf ex Is ArgumentException OrElse TypeOf ex Is InvalidOperationException OrElse TypeOf ex Is OutOfMemoryException
                ' Leave unreadable records untouched; they are never sent automatically.
            End Try
            If candidate IsNot Nothing Then Yield candidate
        Next
    End Function

    Public Shared Function CleanDiagnostic(value As String, maxBytes As Integer) As String
        If String.IsNullOrEmpty(value) Then Return Nothing
        ' Preserve only the final source filename and line suffix of a stack-trace location.
        ' Strip directories first so the general path scrubber cannot swallow the line number.
        Dim result = Regex.Replace(value,
            "(?im)(?:[A-Z]:[\\/]|\\\\|/)(?:[^\r\n""<>|]*[\\/])?(?<file>[^\\/\r\n""<>|:]+)(?<line>:[ \t]*(?:line|줄|행)[ \t]*\d+)[ \t]*(?=\r?$)",
            "[path removed]/${file}${line}", RegexOptions.None, TimeSpan.FromMilliseconds(200))
        result = Regex.Replace(result, "(?i)(?:[A-Z]:\\|\\\\)[^\r\n""<>|]*", "[path removed]", RegexOptions.None, TimeSpan.FromMilliseconds(200))
        result = Regex.Replace(result, "(?i)\b(password|passwd|token|secret|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+", "$1=[removed]", RegexOptions.None, TimeSpan.FromMilliseconds(200))
        If Not String.IsNullOrWhiteSpace(Environment.UserName) Then result = result.Replace(Environment.UserName, "[user]", StringComparison.OrdinalIgnoreCase)
        Dim builder As New StringBuilder()
        Dim count As Integer
        For Each rune In result.EnumerateRunes()
            If count + rune.Utf8SequenceLength > maxBytes Then Exit For
            builder.Append(rune.ToString())
            count += rune.Utf8SequenceLength
        Next
        Return builder.ToString()
    End Function
End Class

' Browser decodes PNG/JPEG and normalizes attachments to PNG before upload.
' The receiving production API performs full decoding again.
Public NotInheritable Class ReportImage
    Public Property Bytes As Byte()
    Public Property Mime As String
    Public Sub Validate()
        If Bytes Is Nothing OrElse Bytes.Length < 33 OrElse Bytes.Length > 5242880 Then Throw New InvalidDataException("이미지는 장당 5 MiB 이하여야 합니다. / Maximum 5 MiB per image.")
        Dim signature As Byte() = {137, 80, 78, 71, 13, 10, 26, 10}
        If Mime <> "image/png" OrElse Not Bytes.Take(8).SequenceEqual(signature) OrElse Encoding.ASCII.GetString(Bytes, 12, 4) <> "IHDR" Then Throw New InvalidDataException("Invalid PNG image.")
        Dim width = Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(Bytes.AsSpan(16, 4))
        Dim height = Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(Bytes.AsSpan(20, 4))
        If width = 0 OrElse height = 0 OrElse width > 6000 OrElse height > 6000 OrElse CLng(width) * height > 16000000 Then Throw New InvalidDataException("이미지 크기 제한을 초과했습니다. / Image dimensions exceed the limit.")
    End Sub
End Class
Public NotInheritable Class ReportSendResult
    Public Property Accepted As Boolean
    Public Property Message As String
End Class

Public NotInheritable Class UserReportSender
    Friend Const Endpoint As String = "https://comfilewiki.co.kr/downloads/report-submit.php"
    Friend Const UserAgent As String = "ComfileWEB"
    Private Shared ReadOnly http As New HttpClient(New HttpClientHandler With {.AllowAutoRedirect = False, .UseCookies = False}) With {
        .Timeout = TimeSpan.FromSeconds(60), .MaxResponseContentBufferSize = 65536}

    Shared Sub New()
        ' The server closes connections with an empty User-Agent before returning HTTP headers.
        http.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent)
    End Sub

    Public Shared Function SendAsync(report As UserReport, korean As Boolean, cancellation As Threading.CancellationToken) As Task(Of ReportSendResult)
        Return SendCoreAsync(report, korean, http, New Uri(Endpoint), cancellation)
    End Function

    ' Tests use a loopback server and an independent client; the production entry point is fixed above.
    Friend Shared Async Function SendCoreAsync(report As UserReport, korean As Boolean, client As HttpClient, endpointUri As Uri,
                                              cancellation As Threading.CancellationToken) As Task(Of ReportSendResult)
        If report.Blocked Then
            UserReportTransportLog.Record("blocked_locally")
            Return Failure(korean, "이 보고는 서버에서 거부되었습니다. 내용을 확인한 뒤 새 보고를 작성하세요.", "This report was rejected. Review it and create a new report.")
        End If
        If report.RetryAt > DateTimeOffset.UtcNow Then
            UserReportTransportLog.Record("retry_delay_locally")
            Return Failure(korean, "다시 시도할 수 있는 시각: " & report.RetryAt.ToLocalTime().ToString("g"), "Retry after: " & report.RetryAt.ToLocalTime().ToString("g"))
        End If
        UserReportTransportLog.Record("validate_and_save")
        report.Validate()
        report.Save() ' Never transmit a request that cannot be retained for an exact retry.
        Using form As New MultipartFormDataContent("StudioReport-" & report.Id)
            UserReportTransportLog.Record("build_multipart")
            form.Add(New StringContent(report.Metadata, Encoding.UTF8), "metadata")
            For i = 0 To report.Images.Count - 1
                Dim picture = report.Images(i)
                Dim part As New ByteArrayContent(picture.Bytes)
                part.Headers.ContentType = New MediaTypeHeaderValue(picture.Mime)
                form.Add(part, "images[]", "image-" & (i + 1).ToString(Globalization.CultureInfo.InvariantCulture) & If(picture.Mime = "image/png", ".png", ".jpg"))
            Next
            Dim receivedStatus As Integer? = Nothing
            Try
                Using timeout = Threading.CancellationTokenSource.CreateLinkedTokenSource(cancellation),
                      request As New HttpRequestMessage(HttpMethod.Post, endpointUri) With {.Content = form}
                timeout.CancelAfter(TimeSpan.FromSeconds(60))
                request.Headers.UserAgent.ParseAdd(UserAgent)
                Await form.LoadIntoBufferAsync(16777216, timeout.Token)
                UserReportTransportLog.Record("send_started")
                Using response = Await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token)
                    Dim status = CInt(response.StatusCode)
                    receivedStatus = status
                    UserReportTransportLog.Record("response_headers_received", status)
                    ' Preserve authoritative header decisions even if the body is truncated or cancelled.
                    If status = 409 OrElse status = 413 OrElse status = 422 Then
                        report.Blocked = True
                        report.Save()
                    ElseIf status = 429 Then
                        SetRetryDelay(report, response.Headers.RetryAfter, 0)
                    End If
                    Dim accepted As Boolean
                    Dim retrySeconds As Long
                    Try
                        Await response.Content.LoadIntoBufferAsync(65536, timeout.Token)
                        Using document = JsonDocument.Parse(Await response.Content.ReadAsStringAsync(timeout.Token))
                            Dim field As JsonElement
                            If document.RootElement.ValueKind = JsonValueKind.Object Then
                                accepted = document.RootElement.TryGetProperty("accepted", field) AndAlso field.ValueKind = JsonValueKind.True
                                If document.RootElement.TryGetProperty("retry_after", field) AndAlso field.ValueKind = JsonValueKind.Number Then field.TryGetInt64(retrySeconds)
                            End If
                        End Using
                    Catch ex As Exception When TypeOf ex Is JsonException OrElse TypeOf ex Is HttpRequestException OrElse TypeOf ex Is IO.IOException OrElse TypeOf ex Is OperationCanceledException
                        UserReportTransportLog.Record("invalid_response_json", status, ex)
                        If status <> 409 AndAlso status <> 413 AndAlso status <> 422 AndAlso status <> 429 Then
                            If cancellation.IsCancellationRequested Then Return Cancelled(korean)
                        End If
                    End Try
                    If (status = 200 OrElse status = 201) AndAlso accepted Then
                        UserReportTransportLog.Record("accepted", status)
                        report.Completed = True
                        Try
                            report.Save()
                            report.Remove()
                        Catch ex As IOException
                            ' The server accepted it; any surviving copy retains the same ID.
                        Catch ex As UnauthorizedAccessException
                        End Try
                        Return New ReportSendResult With {.Accepted = True}
                    End If
                    UserReportTransportLog.Record("not_accepted", status)
                    Select Case status
                        Case 409, 413, 422
                            report.Blocked = True
                            report.Save()
                            Select Case status
                                Case 409
                                    Return Failure(korean, "보고 ID가 기존 내용과 충돌합니다. 덮어쓰지 않았습니다. 새 보고가 필요합니다.", "Report ID conflict. Nothing was overwritten. A new report is required.")
                                Case 413
                                    Return Failure(korean, "서버의 용량 제한을 초과했습니다. 이미지나 내용을 줄여 새 보고를 작성하세요.", "The request exceeds the server size limit. Create a smaller report.")
                                Case Else
                                    Return Failure(korean, "서버가 입력 내용을 거부했습니다. 내용과 이미지 조건을 확인하고 새 보고를 작성하세요.", "The server rejected the input. Review the content and image limits before creating a new report.")
                            End Select
                        Case 429
                            SetRetryDelay(report, response.Headers.RetryAfter, retrySeconds)
                            Return Failure(korean, "접수 요청이 많습니다. 다음 시각 이후 같은 보고를 다시 보내세요: " & report.RetryAt.ToLocalTime().ToString("g"), "Rate limited. Retry the same report after: " & report.RetryAt.ToLocalTime().ToString("g"))
                        Case 500 To 599
                            Return Failure(korean, "서버 오류입니다. 보고를 보관했습니다. ‘다시 보내기’로 재시도하세요.", "Server error. The report is retained. Use Retry.")
                        Case Else
                            Return Failure(korean, "접수를 확인하지 못했습니다 (HTTP " & status & "). 같은 보고로 다시 시도할 수 있습니다.", "Receipt was not confirmed (HTTP " & status & "). You can retry the same report.")
                    End Select
                End Using
                End Using
            Catch ex As Exception When TypeOf ex Is HttpRequestException OrElse TypeOf ex Is OperationCanceledException OrElse TypeOf ex Is IO.IOException
                UserReportTransportLog.Record("transport_failed", receivedStatus, ex)
                If cancellation.IsCancellationRequested Then Return Cancelled(korean)
                Return Failure(korean, "서버 응답을 확인하지 못했습니다. 보고를 보관했습니다. 연결을 확인하고 ‘다시 보내기’를 누르세요.", "No confirmed server response. The report is retained. Check your connection and retry.")
            End Try
        End Using
    End Function

    Private Shared Sub SetRetryDelay(report As UserReport, header As RetryConditionHeaderValue, jsonSeconds As Long)
        Dim now = DateTimeOffset.UtcNow
        Dim delay = Math.Max(60L, jsonSeconds)
        If header IsNot Nothing Then
            If header.Delta.HasValue Then delay = Math.Max(delay, CLng(Math.Ceiling(header.Delta.Value.TotalSeconds)))
            If header.Date.HasValue Then delay = Math.Max(delay, CLng(Math.Ceiling((header.Date.Value - now).TotalSeconds)))
        End If
        Dim retry = If(delay >= (DateTimeOffset.MaxValue - now).TotalSeconds, DateTimeOffset.MaxValue, now.AddSeconds(delay))
        If retry > report.RetryAt Then report.RetryAt = retry
        report.Save()
    End Sub

    Private Shared Function Cancelled(korean As Boolean) As ReportSendResult
        Return Failure(korean, "전송 대기를 취소했습니다. 서버 접수 여부는 확인되지 않았습니다. 같은 보고로 다시 보낼 수 있습니다.",
                       "Sending was cancelled. Server receipt is unconfirmed. You can retry the same report.")
    End Function

    Private Shared Function Failure(korean As Boolean, ko As String, en As String) As ReportSendResult
        Return New ReportSendResult With {.Message = If(korean, ko, en)}
    End Function
End Class
