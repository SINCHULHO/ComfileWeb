using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace ComfileWeb.Services;

public static class McpStdioServer
{
    private static readonly JsonArray Definitions = LoadDefinitions();
    private static JsonArray LoadDefinitions()
    {
        using var stream = typeof(McpStdioServer).Assembly.GetManifestResourceStream("ComfileWeb.Mcp.tools.json")!;
        return JsonNode.Parse(stream)!.AsArray();
    }
    public static void ValidateTool(string name, JsonObject arguments)
    {
        var tool = Definitions.FirstOrDefault(t => t!["name"]!.GetValue<string>() == name)
            ?? throw new ArgumentException("Unknown tool: " + name);
        Validate(arguments, tool["inputSchema"]!.AsObject(), "arguments");
    }
    private static void Validate(JsonNode? value, JsonObject schema, string path)
    {
        string type = schema["type"]?.GetValue<string>() ?? "";
        bool valid = type switch
        {
            "object" => value is JsonObject,
            "array" => value is JsonArray,
            "string" => value?.GetValueKind() == JsonValueKind.String,
            "integer" => value is JsonValue number && number.TryGetValue<int>(out _),
            "boolean" => value?.GetValueKind() is JsonValueKind.True or JsonValueKind.False,
            _ => true
        };
        if (!valid) throw new ArgumentException(path + " must be " + type);
        if (schema["enum"] is JsonArray choices && !choices.Any(c => JsonNode.DeepEquals(c, value)))
            throw new ArgumentException(path + " is not an allowed value.");
        if (type == "integer")
        {
            int number = value!.GetValue<int>();
            if (schema["minimum"] is { } min && number < min.GetValue<int>() || schema["maximum"] is { } max && number > max.GetValue<int>())
                throw new ArgumentException(path + " is out of range.");
        }
        if (type == "string" && value!.GetValue<string>().Length > 4096) throw new ArgumentException(path + " is too long.");
        if (value is JsonObject obj)
        {
            foreach (var required in schema["required"]?.AsArray() ?? [])
                if (!obj.ContainsKey(required!.GetValue<string>())) throw new ArgumentException(path + " missing " + required);
            var properties = schema["properties"]?.AsObject() ?? new JsonObject();
            foreach (var pair in obj)
            {
                if (properties[pair.Key] is JsonObject child) Validate(pair.Value, child, path + "." + pair.Key);
                else if (schema["additionalProperties"]?.GetValueKind() == JsonValueKind.False)
                    throw new ArgumentException(path + " unknown field: " + pair.Key);
            }
        }
        if (value is JsonArray array)
        {
            if (array.Count > (schema["maxItems"]?.GetValue<int>() ?? 500) || array.Count < (schema["minItems"]?.GetValue<int>() ?? 0))
                throw new ArgumentException(path + " has an invalid item count.");
            if (schema["items"] is JsonObject itemSchema)
                foreach (var item in array) Validate(item, itemSchema, path + "[]");
        }
    }

    public static async Task RunAsync()
    {
        // 표준 출력에는 MCP JSON-RPC만 기록한다.
        Console.InputEncoding = Console.OutputEncoding = new UTF8Encoding(false);
        bool initialized = false;
        while (await Console.In.ReadLineAsync() is { } line)
        {
            JsonNode? id = null;
            bool notification = false;
            try
            {
                if (line.Length > 2 * 1024 * 1024) throw new RpcError(-32600, "Message too large.");
                JsonObject request;
                try { request = JsonNode.Parse(line) as JsonObject ?? throw new RpcError(-32600, "Expected an object."); }
                catch (JsonException) { throw new RpcError(-32700, "Parse error."); }
                id = request["id"]?.DeepClone();
                if (request["jsonrpc"]?.ToString() != "2.0" || request["method"]?.GetValueKind() != JsonValueKind.String)
                    throw new RpcError(-32600, "Invalid request.");
                notification = !request.ContainsKey("id");
                if (notification) continue;
                if (id?.GetValueKind() is not (JsonValueKind.String or JsonValueKind.Number)) throw new RpcError(-32600, "Invalid id.");
                string method = request["method"]!.GetValue<string>();
                var parameters = request["params"]?.AsObject() ?? new JsonObject();
                JsonObject result;
                if (method == "initialize")
                {
                    string requested = parameters["protocolVersion"]?.GetValue<string>() ?? "";
                    string protocol = new[] { "2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25" }.Contains(requested) ? requested : "2025-11-25";
                    initialized = true;
                    result = new JsonObject {
                        ["protocolVersion"] = protocol,
                        ["serverInfo"] = new JsonObject { ["name"] = "comfileweb", ["version"] = typeof(McpStdioServer).Assembly.GetName().Version!.ToString(3) },
                        ["capabilities"] = new JsonObject { ["tools"] = new JsonObject() },
                        ["instructions"] = "Open ComfileWEB and a local browser. Start with list_editors, get_document and get_widget_catalog. Use explicit editorId and current expectedRevision for edits. Coordinates are grid cells. apply_changes is atomic and undoable; save_project saves explicitly. On timeout read again before retrying. Device tools operate real CFNET hardware separately from editor tools: use only user-requested addresses/values, inspect status, connect explicitly, and read back. Never infer authorization for physical outputs from a request to design a screen. No CUBLOC2 support."
                    };
                }
                else if (method == "ping") result = new();
                else if (!initialized) throw new RpcError(-32002, "Initialize first.");
                else if (method == "tools/list") result = new() { ["tools"] = Definitions.DeepClone() };
                else if (method == "tools/call")
                {
                    string name = parameters["name"]?.GetValue<string>() ?? "";
                    var arguments = parameters["arguments"]?.AsObject() ?? new JsonObject();
                    ValidateTool(name, arguments);
                    JsonObject response;
                    try { response = await CallAsync(name, arguments); }
                    catch (Exception ex) { response = McpPipeService.Failure("APP_UNAVAILABLE", "Start ComfileWEB under the same Windows user/session. On timeout read state before retrying. " + ex.Message); }
                    result = new() { ["content"] = new JsonArray(new JsonObject { ["type"] = "text", ["text"] = response.ToJsonString() }),
                        ["isError"] = response["success"]?.GetValue<bool>() != true };
                }
                else throw new RpcError(-32601, "Method not found.");
                await Console.Out.WriteLineAsync(new JsonObject { ["jsonrpc"] = "2.0", ["id"] = id, ["result"] = result }.ToJsonString());
            }
            catch (Exception ex)
            {
                if (!notification) await Console.Out.WriteLineAsync(new JsonObject { ["jsonrpc"] = "2.0", ["id"] = id,
                    ["error"] = new JsonObject { ["code"] = ex is RpcError rpc ? rpc.Code : -32602, ["message"] = ex.Message } }.ToJsonString());
            }
        }
    }
    private static async Task<JsonObject> CallAsync(string name, JsonObject arguments)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows is required.");
        using var pipe = new NamedPipeClientStream(".", McpPipeService.PipeName, PipeDirection.InOut, PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        await pipe.ConnectAsync(3000, timeout.Token);
        using var writer = new StreamWriter(pipe, new UTF8Encoding(false), 4096, true) { AutoFlush = true };
        using var reader = new StreamReader(pipe, new UTF8Encoding(false), false, 4096, true);
        await writer.WriteLineAsync(new JsonObject { ["name"] = name, ["arguments"] = arguments.DeepClone() }.ToJsonString().AsMemory(), timeout.Token);
        return JsonNode.Parse(await reader.ReadLineAsync(timeout.Token) ?? throw new IOException("Application disconnected."))!.AsObject();
    }
    private sealed class RpcError(int code, string message) : Exception(message) { public int Code { get; } = code; }
}
