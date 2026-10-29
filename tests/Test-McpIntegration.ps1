$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dll = Join-Path $root 'ComfileWeb\bin\Release\net10.0\ComfileWeb.dll'
$instance = 'test-' + [Guid]::NewGuid().ToString('N')
$port = 15017
$base = "http://127.0.0.1:$port"
function Start-TestProcess([string]$arguments) {
    $info = [Diagnostics.ProcessStartInfo]::new('dotnet', $arguments)
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables['ASPNETCORE_ENVIRONMENT'] = 'Development'
    $info.EnvironmentVariables['COMFILEWEB_MCP_INSTANCE'] = $instance
    $info.EnvironmentVariables['ComfileWeb__ProjectsDirectory'] = Join-Path $root "dist\mcp-tests\$instance"
    return [Diagnostics.Process]::Start($info)
}
function Await($task) {
    if (-not $task.Wait(15000)) { throw 'Test operation timed out.' }
    return $task.GetAwaiter().GetResult()
}
function Assert($condition, $message) { if (-not $condition) { throw $message } }
$script:rpcId = 0
function Send-Rpc($method, $parameters) {
    $script:rpcId++
    $rpc.StandardInput.WriteLine((@{ jsonrpc = '2.0'; id = $script:rpcId; method = $method; params = $parameters } | ConvertTo-Json -Depth 30 -Compress))
    $rpc.StandardInput.Flush()
}
function Read-Rpc { return ((Await ($rpc.StandardOutput.ReadLineAsync())) | ConvertFrom-Json) }
function Call-Tool($name, $arguments) {
    Send-Rpc 'tools/call' @{ name = $name; arguments = $arguments }
    return Read-Rpc
}
function Read-Socket {
    $buffer = New-Object byte[] 65536
    $received = Await ($socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None))
    return ([Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count) | ConvertFrom-Json)
}
$web = $null; $rpc = $null; $socket = $null
try {
    $web = Start-TestProcess "`"$dll`" --no-browser --urls $base --contentRoot `"$(Join-Path $root 'ComfileWeb')`""
    $webLog = $web.StandardOutput.ReadToEndAsync()
    $webErr = $web.StandardError.ReadToEndAsync()
    for ($i = 0; $i -lt 60; $i++) {
        try { $null = Invoke-RestMethod "$base/api/version"; break } catch { Start-Sleep -Milliseconds 200 }
    }
    Assert (-not $web.HasExited) 'Web server exited.'
    $rpc = Start-TestProcess "`"$dll`" --mcp"
    Send-Rpc 'initialize' @{ protocolVersion = '2025-11-25'; capabilities = @{}; clientInfo = @{ name = 'integration'; version = '1' } }
    Assert ((Read-Rpc).result.protocolVersion -eq '2025-11-25') 'Initialize failed.'
    Send-Rpc 'tools/list' @{}
    Assert ((Read-Rpc).result.tools.Count -eq 13) 'Tool catalog differs.'
    $invalid = Call-Tool 'device_write' @{ headerAddress = 0; address = 'DO.0.0'; value = 1 }
    Assert ($invalid.error.code -eq -32602) 'Unconfirmed physical write was accepted.'
    $list = (Call-Tool 'list_editors' @{}).result.content[0].text | ConvertFrom-Json
    Assert ($list.success -and $list.editors.Count -eq 0) ("Named pipe round trip failed: " + ($list | ConvertTo-Json -Compress))
    $rejected = $false
    try { Invoke-WebRequest "$base/mcp/editor" -Headers @{ Origin = 'http://untrusted.example' } | Out-Null } catch { $rejected = [int]$_.Exception.Response.StatusCode -eq 403 }
    Assert $rejected 'Cross-origin request was not rejected.'
    $socket = [Net.WebSockets.ClientWebSocket]::new()
    $socket.Options.SetRequestHeader('Origin', $base)
    Await ($socket.ConnectAsync([Uri]"ws://127.0.0.1:$port/mcp/editor", [Threading.CancellationToken]::None))
    $editor = Read-Socket
    Assert ($editor.editorId.Length -gt 0) 'Editor handshake failed.'
    $list = (Call-Tool 'list_editors' @{}).result.content[0].text | ConvertFrom-Json
    Assert ($list.editors[0].editorId -eq $editor.editorId) 'Editor registration failed.'
    Send-Rpc 'tools/call' @{ name = 'get_document'; arguments = @{ editorId = $editor.editorId } }
    $request = Read-Socket
    Assert ($request.name -eq 'get_document') 'Wrong editor request.'
    $bytes = [Text.Encoding]::UTF8.GetBytes((@{ id = $request.id; result = @{ success = $true; revision = 'test-revision'; document = @{ pages = @() } } } | ConvertTo-Json -Depth 20 -Compress))
    Await ($socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None))
    $response = (Read-Rpc).result.content[0].text | ConvertFrom-Json
    Assert ($response.revision -eq 'test-revision') 'Editor response was not routed to MCP.'
    $payload = @{ name = 'overwrite-test'; documentText = '{"pages":[]}'; failIfExists = $true } | ConvertTo-Json
    $null = Invoke-RestMethod "$base/api/project/save" -Method Post -ContentType 'application/json' -Body $payload
    $conflict = $false
    try { Invoke-RestMethod "$base/api/project/save" -Method Post -ContentType 'application/json' -Body $payload | Out-Null } catch { $conflict = [int]$_.Exception.Response.StatusCode -eq 409 }
    Assert $conflict 'Existing project was overwritten.'
    Write-Host 'PASS: initialization, 13 tools, write guard, named pipe, origin guard, editor WebSocket round trip, save conflict.'
} finally {
    if ($socket) { $socket.Dispose() }
    if ($rpc -and -not $rpc.HasExited) { $rpc.Kill() }
    if ($web -and -not $web.HasExited) { $web.Kill() }
}

