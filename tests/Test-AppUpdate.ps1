param([Parameter(Mandatory)][string]$NewExecutable)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$repo = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path $repo ('dist\update-test-' + [Guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $testRoot
$port = 15019
$base = "http://127.0.0.1:$port"
$newPath = (Resolve-Path -LiteralPath $NewExecutable).Path
$nextVersion = (Get-Item -LiteralPath $newPath).VersionInfo.ProductVersion.Split('+')[0]
$info = [Diagnostics.ProcessStartInfo]::new('dotnet')
$info.Arguments = '"' + (Join-Path $repo 'ComfileWeb\bin\Release\net10.0\ComfileWeb.dll') + '" --no-browser --urls ' + $base + ' --contentRoot "' + (Join-Path $repo 'ComfileWeb') + '"'
$info.UseShellExecute = $false; $info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
$info.EnvironmentVariables['ASPNETCORE_ENVIRONMENT'] = 'Development'
$info.EnvironmentVariables['COMFILEWEB_MCP_INSTANCE'] = 'update-test-' + [Guid]::NewGuid().ToString('N')
$info.EnvironmentVariables['COMFILEWEB_UPDATE_DIRECTORY'] = $testRoot
$info.EnvironmentVariables['ComfileWeb__ProjectsDirectory'] = Join-Path $testRoot 'projects'
$server = [Diagnostics.Process]::Start($info)
$output = $server.StandardOutput.ReadToEndAsync(); $errors = $server.StandardError.ReadToEndAsync()
$socket = $null
$client = [Net.Http.HttpClient]::new(); $client.Timeout = [TimeSpan]::FromSeconds(20)
function Await($task) { if (-not $task.Wait(25000)) { throw 'Test timed out' }; return $task.GetAwaiter().GetResult() }
function Assert($condition, $message) { if (-not $condition) { throw $message } }
function Read-Message {
    $buffer = New-Object byte[] 65536
    $received = Await ($socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None))
    return ([Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count) | ConvertFrom-Json)
}
function Reply($message, $success) {
    $bytes = [Text.Encoding]::UTF8.GetBytes((@{id=$message.id;result=@{success=$success}} | ConvertTo-Json -Compress))
    $null = Await ($socket.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, [Threading.CancellationToken]::None))
}
function Post-Update($token) {
    $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, "$base/api/app/update")
    $request.Headers.Add('Origin', $base); $request.Headers.Add('X-Comfile-Update-Token', $token)
    return $client.SendAsync($request)
}
try {
    for ($i=0; $i -lt 60; $i++) {
        try { $state = Invoke-RestMethod "$base/api/app/update"; break } catch { Start-Sleep -Milliseconds 200 }
    }
    Assert ($state.currentVersion -ne $nextVersion) 'Test requires a different newer build.'
    [IO.File]::WriteAllText((Join-Path $testRoot "update-$port.json"), (@{Executable=$newPath;Version=$nextVersion;Url=$base} | ConvertTo-Json))
    $state = Invoke-RestMethod "$base/api/app/update"
    Assert ($state.availableVersion -eq $nextVersion) 'Pending build not detected.'
    $unauthorized = Await (Post-Update 'wrong-token')
    Assert ([int]$unauthorized.StatusCode -eq 403) 'Invalid token accepted.'
    $noEditors = Await (Post-Update $state.token)
    Assert ([int]$noEditors.StatusCode -eq 409) 'Restart allowed without an editor.'
    $socket = [Net.WebSockets.ClientWebSocket]::new(); $socket.Options.SetRequestHeader('Origin', $base)
    $null = Await ($socket.ConnectAsync([Uri]"ws://127.0.0.1:$port/mcp/editor", [Threading.CancellationToken]::None))
    $null = Read-Message
    $dirtyRequest = Post-Update $state.token
    $message = Read-Message; Assert ($message.name -eq 'lock_for_update') 'Missing editor guard.'; Reply $message $false
    $message = Read-Message; Assert ($message.name -eq 'unlock_after_update') 'Missing unlock after refusal.'; Reply $message $true
    Assert ([int](Await $dirtyRequest).StatusCode -eq 409) 'Dirty editor allowed restart.'
    $cleanRequest = Post-Update $state.token
    $message = Read-Message; Reply $message $true
    Assert ([int](Await $cleanRequest).StatusCode -eq 200) 'Clean update failed.'
    $watch = [Diagnostics.Stopwatch]::StartNew()
    while ($watch.Elapsed.TotalSeconds -lt 35) {
        Start-Sleep -Milliseconds 200
        try { if ((Invoke-RestMethod "$base/api/version" -TimeoutSec 2).version -eq $nextVersion) { break } } catch { }
    }
    if ($output.IsCompleted) { [IO.File]::WriteAllText((Join-Path $testRoot 'old-server.log'), $output.Result) }
    if ($errors.IsCompleted) { [IO.File]::WriteAllText((Join-Path $testRoot 'old-server-error.log'), $errors.Result) }
    Assert ((Invoke-RestMethod "$base/api/version" -TimeoutSec 2).version -eq $nextVersion) 'New server did not start.'
    Assert $server.HasExited 'Old server did not stop.'
    Write-Host 'PASS: version discovery, token guard, no-editor/dirty-editor refusal, unlock and real version handoff.'
} finally {
    if ($socket) { $socket.Dispose() }; $client.Dispose()
    if (-not $server.HasExited) { $server.Kill() }
    Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $newPath -and $_.CommandLine -like "*$port*" } | ForEach-Object { Stop-Process -Id $_.ProcessId }
}
