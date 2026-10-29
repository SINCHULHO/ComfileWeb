using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json.Nodes;

namespace ComfileWeb.Services;

// 브라우저마다 별도 세션을 유지하고 요청 결과를 같은 연결에서만 받는다.
public sealed class McpEditorBridge
{
    private sealed class Session(WebSocket socket)
    {
        public WebSocket Socket { get; } = socket;
        public SemaphoreSlim SendLock { get; } = new(1);
        public ConcurrentDictionary<string, TaskCompletionSource<JsonObject>> Pending { get; } = new();
    }
    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    private readonly object _updateSync = new();
    private bool _updateLocked;

    public JsonObject List() => new() { ["success"] = true,
        ["editors"] = new JsonArray(_sessions.Keys.Select(id => (JsonNode)new JsonObject { ["editorId"] = id }).ToArray()) };

    public async Task HandleAsync(WebSocket socket, CancellationToken cancellation)
    {
        string editorId = Guid.NewGuid().ToString("N");
        var session = new Session(socket);
        lock (_updateSync) { if (_updateLocked) return; _sessions[editorId] = session; }
        try
        {
            await SendAsync(session, new JsonObject { ["editorId"] = editorId }, cancellation);
            var buffer = new byte[8192];
            while (socket.State == WebSocketState.Open && !cancellation.IsCancellationRequested)
            {
                using var data = new MemoryStream();
                WebSocketReceiveResult result;
                do
                {
                    result = await socket.ReceiveAsync(buffer, cancellation);
                    if (result.MessageType == WebSocketMessageType.Close) return;
                    if (result.MessageType != WebSocketMessageType.Text) throw new IOException("Text frames required.");
                    data.Write(buffer, 0, result.Count);
                    if (data.Length > 4 * 1024 * 1024) throw new IOException("Editor response too large.");
                } while (!result.EndOfMessage);
                var message = JsonNode.Parse(data.ToArray())!.AsObject();
                var id = message["id"]?.GetValue<string>();
                if (id is not null && session.Pending.TryRemove(id, out var pending))
                    pending.TrySetResult(message["result"]?.AsObject() ?? McpPipeService.Failure("INVALID_RESPONSE", "Missing result."));
            }
        }
        catch (Exception ex) when (ex is WebSocketException or OperationCanceledException or IOException or System.Text.Json.JsonException) { }
        finally
        {
            _sessions.TryRemove(editorId, out _);
            foreach (var pending in session.Pending.Values)
                pending.TrySetResult(McpPipeService.Failure("EDITOR_CLOSED", "Editor closed. Read the document before retrying an edit."));
        }
    }

    public async Task<JsonObject> CallAsync(string name, JsonObject arguments, CancellationToken cancellation)
    {
        string editorId = arguments["editorId"]?.GetValue<string>() ?? "";
        if (!_sessions.TryGetValue(editorId, out var session))
            return McpPipeService.Failure("EDITOR_NOT_FOUND", "Open ComfileWEB in a local browser and call list_editors.");
        var id = Guid.NewGuid().ToString("N");
        var pending = new TaskCompletionSource<JsonObject>(TaskCreationOptions.RunContinuationsAsynchronously);
        session.Pending[id] = pending;
        try
        {
            await SendAsync(session, new JsonObject { ["id"] = id, ["name"] = name, ["arguments"] = arguments.DeepClone() }, cancellation);
            return await pending.Task.WaitAsync(TimeSpan.FromSeconds(25), cancellation);
        }
        catch (Exception ex) when (ex is TimeoutException or WebSocketException)
        {
            return McpPipeService.Failure("EDITOR_TIMEOUT", "Outcome unknown. Read the document before retrying. " + ex.Message);
        }
        finally { session.Pending.TryRemove(id, out _); }
    }

    public async Task<JsonObject?> LockForUpdateAsync(CancellationToken cancellation, bool discardUnsaved = false)
    {
        string[] ids;
        lock (_updateSync) { _updateLocked = true; ids = _sessions.Keys.ToArray(); }
        if (ids.Length == 0) return McpPipeService.Failure("NO_EDITORS", "No local editor is connected. Reopen the local page.");
        foreach (var id in ids)
        {
            var result = await CallAsync("lock_for_update", new JsonObject { ["editorId"] = id, ["version"] = AppUpdateService.CurrentVersion, ["discardUnsaved"] = discardUnsaved }, cancellation);
            if (result["success"]?.GetValue<bool>() != true)
            {
                if (result["code"] is null) result["code"] = "EDITOR_BLOCKED";
                result["editorId"] = id;
                return result;
            }
        }
        // 확인 도중 새 탭이 연결됐으면 다시 확인하도록 한다.
        return ids.ToHashSet().SetEquals(_sessions.Keys) ? null
            : McpPipeService.Failure("EDITORS_CHANGED", "The editor connections changed. Retry the update.");
    }

    public void DisconnectForUpdate()
    {
        foreach (var session in _sessions.Values) session.Socket.Abort();
    }

    public async Task UnlockAfterUpdateAsync()
    {
        lock (_updateSync) _updateLocked = false;
        foreach (var id in _sessions.Keys)
            try { await CallAsync("unlock_after_update", new JsonObject { ["editorId"] = id }, CancellationToken.None); } catch { }
    }

    private static async Task SendAsync(Session session, JsonObject message, CancellationToken cancellation)
    {
        await session.SendLock.WaitAsync(cancellation);
        try { await session.Socket.SendAsync(Encoding.UTF8.GetBytes(message.ToJsonString()), WebSocketMessageType.Text, true, cancellation); }
        finally { session.SendLock.Release(); }
    }
}
