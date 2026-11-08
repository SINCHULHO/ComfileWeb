Option Strict On

Imports System.IO
Imports System.Text.Json

' A lease distinguishes an interrupted run from another live Studio process.
Public NotInheritable Class ReportCrashJournal
    Private Shared lease As FileStream
    Private Shared sessionFile As String
    Private Shared sessionReport As UserReport
    Private Shared ReadOnly gate As New Object()
    Private Shared fatalRecorded As Boolean
    Private Shared ReadOnly actions As New Queue(Of String)
    Private Shared startedAt As Long

    ' Callers supply operation names and allow-listed state only, never project text or paths.
    Public Shared Sub RecordAction(action As String)
        SyncLock gate
            If sessionFile Is Nothing OrElse fatalRecorded Then Return
            Try
                actions.Enqueue(DateTime.UtcNow.ToString("HH:mm:ss.fff", Globalization.CultureInfo.InvariantCulture) & "Z " & action)
                While actions.Count > 24
                    actions.Dequeue()
                End While
                UserReport.AtomicWrite(sessionFile & ".activity.json", JsonSerializer.Serialize(actions.ToArray()))
            Catch
                ' Breadcrumb failures must not interrupt the operation being diagnosed.
            End Try
        End SyncLock
    End Sub

    Public Shared Function HasException(report As UserReport) As Boolean
        Try
            Using document = JsonDocument.Parse(report.Metadata)
                Dim diagnostic As JsonElement
                Dim errorType As JsonElement
                Return document.RootElement.TryGetProperty("diagnostic", diagnostic) AndAlso
                    diagnostic.ValueKind = JsonValueKind.Object AndAlso diagnostic.TryGetProperty("error_type", errorType) AndAlso
                    errorType.ValueKind = JsonValueKind.String AndAlso Not String.IsNullOrWhiteSpace(errorType.GetString())
            End Using
        Catch
            Return False
        End Try
    End Function

    Private Shared Function RecentActions() As String
        Dim selected As New List(Of String)
        Dim bytes As Integer
        For Each entry In actions.Reverse()
            Dim size = System.Text.Encoding.UTF8.GetByteCount(entry & Environment.NewLine)
            If bytes + size > 2000 Then Exit For
            selected.Add(entry)
            bytes += size
        Next
        selected.Reverse()
        Return String.Join(Environment.NewLine, selected)
    End Function

    Public Shared Sub StartSession()
        Try
            Directory.CreateDirectory(UserReport.Folder)
            For Each previous In Directory.GetFiles(UserReport.Folder, "*.session.json")
                Try
                    Using previousLease As New FileStream(previous & ".lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None)
                        If New FileInfo(previous).Length > 262144 Then Continue For
                        Dim report = JsonSerializer.Deserialize(Of UserReport)(File.ReadAllText(previous))
                        If report Is Nothing Then Continue For
                        report.Validate()
                        Dim destination = Path.Combine(UserReport.Folder, report.Id & ".report.json")
                        If HasException(report) AndAlso Not File.Exists(destination) Then report.Save()
                        If File.Exists(previous & ".activity.json") Then
                            File.Move(previous & ".activity.json", Path.Combine(UserReport.Folder, "previous-session-activity.json"), True)
                        End If
                        File.Delete(previous)
                    End Using
                    File.Delete(previous & ".lock")
                Catch
                    ' Active or unreadable sessions are left alone.
                End Try
            Next
            Dim data = UserReport.BaseMetadata("crash")
            data.Add("description", "The previous ComfileWEB server session did not close normally. The cause and exact termination time are unknown.")
            sessionReport = New UserReport With {.Metadata = JsonSerializer.Serialize(data, UserReport.JsonOptions)}
            sessionFile = Path.Combine(UserReport.Folder, sessionReport.Id & ".session.json")
            startedAt = Environment.TickCount64
            lease = New FileStream(sessionFile & ".lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None)
            UserReport.AtomicWrite(sessionFile, JsonSerializer.Serialize(sessionReport, UserReport.JsonOptions))
            RecordAction("ComfileWEB server startup")
        Catch
            ' Recovery reporting must never prevent startup.
        End Try
    End Sub

    Public Shared Sub RecordFatal(ex As Exception, source As String)
        SyncLock gate
            If fatalRecorded OrElse ex Is Nothing Then Return
            fatalRecorded = True
            Try
                Dim data = UserReport.BaseMetadata("crash")
                If sessionReport IsNot Nothing Then data("report_id") = sessionReport.Id
                data.Add("occurred_at", DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", Globalization.CultureInfo.InvariantCulture))
                data.Add("description", "ComfileWEB server encountered an unhandled exception before terminating.")
                data("environment") = CStr(data("environment")) & "; module=" & Reflection.Assembly.GetEntryAssembly().ManifestModule.ModuleVersionId.ToString("D") &
                    "; thread=" & Environment.CurrentManagedThreadId.ToString(Globalization.CultureInfo.InvariantCulture) &
                    "; uptime_ms=" & (Environment.TickCount64 - startedAt).ToString(Globalization.CultureInfo.InvariantCulture) & "; handler=" & source
                Dim recent = RecentActions()
                If recent.Length > 0 Then data.Add("last_action", recent)
                If ex IsNot Nothing Then
                    Dim diagnostic As New Dictionary(Of String, String) From {
                        {"error_type", UserReport.CleanDiagnostic(ex.GetType().FullName, 256)},
                        {"error_code", "0x" & ex.HResult.ToString("X8", Globalization.CultureInfo.InvariantCulture)}}
                    If Not String.IsNullOrEmpty(ex.Message) Then diagnostic.Add("message", UserReport.CleanDiagnostic(ex.Message, 8192))
                    ' ToString also preserves inner/aggregate exceptions when the outer stack is empty.
                    diagnostic.Add("stack_trace", UserReport.CleanDiagnostic(ex.ToString(), 32768))
                    data.Add("diagnostic", diagnostic)
                    ' JSON escaping can expand control characters beyond the UTF-8 field sizes.
                    While System.Text.Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(data, UserReport.JsonOptions)) > 65536 AndAlso diagnostic("stack_trace").Length > 0
                        diagnostic("stack_trace") = UserReport.CleanDiagnostic(diagnostic("stack_trace"), System.Text.Encoding.UTF8.GetByteCount(diagnostic("stack_trace")) \ 2)
                    End While
                End If
                sessionReport = New UserReport With {.Metadata = JsonSerializer.Serialize(data, UserReport.JsonOptions)}
                sessionReport.Validate()
                If sessionFile IsNot Nothing Then
                    UserReport.AtomicWrite(sessionFile, JsonSerializer.Serialize(sessionReport, UserReport.JsonOptions))
                Else
                    sessionReport.Save()
                End If
            Catch
                ' The initial unknown-cause marker and existing crash.log remain fallbacks.
            End Try
        End SyncLock
    End Sub

    Public Shared Sub EndSession(fatal As Boolean)
        SyncLock gate
            Try
                If Not fatal AndAlso Not fatalRecorded AndAlso sessionFile IsNot Nothing Then File.Delete(sessionFile)
                If Not fatal AndAlso Not fatalRecorded AndAlso sessionFile IsNot Nothing Then File.Delete(sessionFile & ".activity.json")
            Catch
            Finally
                lease?.Dispose()
                lease = Nothing
            End Try
            Try
                If sessionFile IsNot Nothing Then File.Delete(sessionFile & ".lock")
            Catch
            End Try
        End SyncLock
    End Sub
End Class
