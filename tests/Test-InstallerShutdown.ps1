$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$root = Join-Path $repo ('dist\installer-test-' + [Guid]::NewGuid().ToString('N'))
$target = Join-Path $root 'target'
$other = Join-Path $root 'other'
$null = New-Item -ItemType Directory -Path $target, $other
$latest = (Get-Content (Join-Path $repo 'dist\latest-publish.txt') -Raw).Trim()
$publish = Join-Path $repo ('dist\' + $latest)
foreach ($destination in @($target, $other)) {
    Get-ChildItem -LiteralPath $publish -File | Copy-Item -Destination $destination
}
[IO.File]::WriteAllText((Join-Path $root 'replacement.txt'), 'new')
[IO.File]::WriteAllText((Join-Path $target 'marker.txt'), 'original')
$include = Join-Path $repo 'installer\CloseRunningApp.iss'
$script = @"
[Setup]
AppName=ComfileWEB installer shutdown test
AppVersion=1
DefaultDirName=$target
PrivilegesRequired=lowest
Uninstallable=no
CreateUninstallRegKey=no
OutputDir=$root
OutputBaseFilename=shutdown-test
DisableProgramGroupPage=yes
[Files]
Source: "$root\replacement.txt"; DestDir: "{app}"; DestName: "marker.txt"; Flags: ignoreversion
[CustomMessages]
CloseTitle=Running
CloseWarning=Save and stop first.
CloseInstall=Close and install
CloseCancel=Cancel
CloseRequired=Close required
CloseFailed=Close or unlock failed
[Code]
#include "$include"
"@
$iss = Join-Path $root 'test.iss'
[IO.File]::WriteAllText($iss, $script)
$compiler = @("$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe", "$env:ProgramFiles\Inno Setup 6\ISCC.exe", "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "$env:LOCALAPPDATA\Programs\Inno Setup 7\ISCC.exe", "$env:ProgramFiles\Inno Setup 7\ISCC.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
& $compiler $iss *> (Join-Path $root 'compile.log')
if ($LASTEXITCODE -ne 0) { throw 'Test installer compilation failed' }
function Start-Mcp($folder) {
    $info = [Diagnostics.ProcessStartInfo]::new((Join-Path $folder 'ComfileWeb.exe'), '--mcp')
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    return [Diagnostics.Process]::Start($info)
}
function Run-Setup($force, $name) {
    $arguments = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', ('/LOG="' + (Join-Path $root ($name + '.log')) + '"'))
    if ($force) { $arguments += '/CLOSECOMFILEWEB' }
    $process = Start-Process -FilePath (Join-Path $root 'shutdown-test.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(45000)) { $process.Kill(); throw 'Installer timeout' }
    return $process.ExitCode
}
function Assert($condition, $message) { if (-not $condition) { throw $message } }
$app = $null; $unrelated = $null; $lock = $null
try {
    $app = Start-Mcp $target; $unrelated = Start-Mcp $other
    Start-Sleep -Seconds 1
    Assert ((Run-Setup $false 'declined') -ne 0) 'Unapproved silent shutdown proceeded'
    Assert (-not $app.HasExited) 'Unapproved process terminated'
    Assert ((Get-Content (Join-Path $target 'marker.txt') -Raw) -eq 'original') 'Files changed before approval'
    Assert ((Run-Setup $true 'approved') -eq 0) 'Approved shutdown failed'
    Assert ($app.WaitForExit(5000)) 'Target process still running'
    Assert (-not $unrelated.HasExited) 'Another folder process was terminated'
    Assert ((Get-Content (Join-Path $target 'marker.txt') -Raw) -eq 'new') 'Installation did not proceed'
    [IO.File]::WriteAllText((Join-Path $target 'marker.txt'), 'original')
    $lock = [IO.File]::Open((Join-Path $target 'clrjit.dll'), 'Open', 'Read', 'Read')
    Assert ((Run-Setup $true 'locked') -ne 0) 'Locked DLL allowed installation'
    Assert ((Get-Content (Join-Path $target 'marker.txt') -Raw) -eq 'original') 'Locked DLL did not block before file copy'
    Write-Host 'PASS: approval required, target-only termination, successful installation and locked DLL refusal.'
} finally {
    if ($lock) { $lock.Dispose() }
    foreach ($process in @($app, $unrelated)) { if ($process -and -not $process.HasExited) { $process.Kill(); $process.WaitForExit() } }
    Write-Host "Test logs: $root"
}
