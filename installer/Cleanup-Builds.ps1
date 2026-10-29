[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateRange(1, 20)][int]$KeepLatest = 3,
    [string]$DistDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'dist')
)
$ErrorActionPreference = 'Stop'
$distRoot = (Resolve-Path -LiteralPath $DistDirectory).Path.TrimEnd('\')
if ($distRoot -eq [IO.Path]::GetPathRoot($distRoot).TrimEnd('\')) { throw 'Refusing to clean a drive root.' }

# 프로세스 목록 확인이 실패하면 정리를 중단하며, 실행 중인 앱과 MCP를 보존한다.
$processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
$folders = @(Get-ChildItem -LiteralPath $distRoot -Directory | Where-Object {
    $_.Name -match '^ComfileWEB(?:-[A-Za-z0-9]+)?$' -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'ComfileWeb.exe')) -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'ComfileWeb.runtimeconfig.json')) -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'coreclr.dll'))
} | Sort-Object LastWriteTimeUtc -Descending)
$keep = @($folders | Select-Object -First $KeepLatest | ForEach-Object FullName)
$latestFile = Join-Path $distRoot 'latest-publish.txt'
if (Test-Path -LiteralPath $latestFile) {
    $latestName = [IO.File]::ReadAllText($latestFile).Trim()
    if ($latestName -match '^ComfileWEB(?:-[A-Za-z0-9]+)?$') { $keep += Join-Path $distRoot $latestName }
}
foreach ($folder in $folders) {
    $target = [IO.Path]::GetFullPath($folder.FullName)
    if ((Split-Path -Parent $target) -ne $distRoot) { throw 'Cleanup target is outside the publish directory.' }
    # 기본 경로는 MCP 클라이언트 설정에서 참조할 수 있어 항상 보존한다.
    if ($folder.Name -eq 'ComfileWEB' -or $keep -contains $target) { continue }
    if ($processes | Where-Object {
        ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)) -or
        ($_.CommandLine -and $_.CommandLine.IndexOf($target + '\', [StringComparison]::OrdinalIgnoreCase) -ge 0)
    }) { Write-Host "Kept running build: $target"; continue }
    if (($folder.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $entries = @(Get-ChildItem -LiteralPath $target -Recurse -Force)
    if ($entries | Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }) { continue }
    $locked = $false
    foreach ($file in ($entries | Where-Object { -not $_.PSIsContainer })) {
        try {
            $handle = [IO.File]::Open($file.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
            $handle.Dispose()
        } catch { $locked = $true; break }
    }
    if ($locked) { Write-Host "Kept locked build: $target"; continue }
    if ($PSCmdlet.ShouldProcess($target, 'Remove old inactive published build')) {
        Remove-Item -LiteralPath $target -Recurse -Force
        Write-Host "Removed old build: $target"
    }
}
