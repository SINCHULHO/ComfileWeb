$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dist = [IO.Path]::GetFullPath((Join-Path $repo 'dist'))
$testRoot = Join-Path $dist ('cleanup-test-' + [Guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $testRoot
$locked = $null
try {
    foreach ($name in @('ComfileWEB', 'ComfileWEB-old', 'ComfileWEB-locked', 'ComfileWEB-new')) {
        $folder = Join-Path $testRoot $name
        $null = New-Item -ItemType Directory -Path $folder
        foreach ($file in @('ComfileWeb.exe', 'ComfileWeb.runtimeconfig.json', 'coreclr.dll')) {
            [IO.File]::WriteAllText((Join-Path $folder $file), 'test')
        }
        (Get-Item -LiteralPath $folder).LastWriteTimeUtc = [DateTime]::UtcNow.AddDays(-10)
    }
    (Get-Item -LiteralPath (Join-Path $testRoot 'ComfileWEB-new')).LastWriteTimeUtc = [DateTime]::UtcNow
    $locked = [IO.File]::Open((Join-Path $testRoot 'ComfileWEB-locked\coreclr.dll'), 'Open', 'Read', 'None')
    & (Join-Path $repo 'installer\Cleanup-Builds.ps1') -DistDirectory $testRoot -KeepLatest 1
    if (Test-Path -LiteralPath (Join-Path $testRoot 'ComfileWEB-old')) { throw 'Inactive old build was not removed.' }
    foreach ($name in @('ComfileWEB', 'ComfileWEB-locked', 'ComfileWEB-new')) {
        if (-not (Test-Path -LiteralPath (Join-Path $testRoot $name))) { throw "Protected build was removed: $name" }
    }
    Write-Host 'PASS: cleanup preserves latest, locked and default MCP builds.'
} finally {
    if ($locked) { $locked.Dispose() }
    $resolved = [IO.Path]::GetFullPath($testRoot)
    if ((Split-Path -Parent $resolved) -ne $dist -or (Split-Path -Leaf $resolved) -notlike 'cleanup-test-*') { throw 'Unexpected test cleanup path.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
