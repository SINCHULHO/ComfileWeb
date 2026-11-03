[CmdletBinding()]
param([Parameter(Mandatory)][string]$BuildRoot, [switch]$IsolatedInstall)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $repo
. (Join-Path $repo 'installer\Signing.Common.ps1')
$tools = Resolve-SigningTools

$build = (Get-Item -LiteralPath $BuildRoot).FullName
if (-not $build.StartsWith((Join-Path $repo 'dist\InstallerBuilds\'), [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BuildRoot must be a repository InstallerBuilds directory.'
}
$audit = Join-Path $build ('signature-test-' + [Guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $audit
Start-Transcript -LiteralPath (Join-Path $audit 'verification.log') | Out-Null
$shell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$signer = Join-Path $repo 'installer\Sign-Artifact.ps1'
$installer = @(Get-ChildItem -LiteralPath (Join-Path $build 'installer') -Filter 'ComfileWEB-Setup-*.exe')
if ($installer.Count -ne 1) { throw 'Exactly one release installer is required.' }
$installer = $installer[0].FullName
$manifest = Get-Content -LiteralPath (Join-Path $build 'package-manifest.json') -Raw | ConvertFrom-Json
$children = @()
$launcher = $null
try {
    $null = Assert-ComfileSignature $installer $tools.SignTool
    $probe = Join-Path $audit 'signed copy.dll'
    Copy-Item -LiteralPath (Join-Path $manifest.publishDirectory 'ComfileWeb.dll') -Destination $probe
    $before = (Get-FileHash -LiteralPath $probe).Hash
    & $shell -NoProfile -ExecutionPolicy Bypass -File $signer -FilePath $probe
    if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath $probe).Hash -ne $before) { throw 'Duplicate-sign prevention failed.' }
    & $shell -NoProfile -ExecutionPolicy Bypass -File $signer -FilePath (Join-Path $audit 'missing.dll')
    if ($LASTEXITCODE -eq 0) { throw 'Missing-file failure was not propagated.' }
    $launcher = Start-Process -FilePath $installer -ArgumentList ('/LANG=english /LOG="' + (Join-Path $audit 'release-startup.log') + '"') -PassThru -WindowStyle Hidden
    for ($i = 0; $i -lt 30; $i++) {
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($launcher.Id)" | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.EndsWith('.tmp') })
        if ($children.Count) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $children.Count) { throw 'Release installer temporary child was not observed; inspect startup log.' }
    foreach ($child in $children) {
        $null = Assert-ComfileSignature $child.ExecutablePath $tools.SignTool
        Copy-Item -LiteralPath $child.ExecutablePath -Destination (Join-Path $audit ('release-child-' + $child.ProcessId + '.exe'))
        Write-Host "Verified actual release temporary process: $($child.ExecutablePath)"
    }
    foreach ($child in $children) { Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue }
    Stop-Process -Id $launcher.Id -Force -ErrorAction SilentlyContinue
    $launcher = $null
    $children = @()

    if ($IsolatedInstall) {
        $source = Get-Content -LiteralPath (Join-Path $repo 'installer\ComfileWEB.iss') -Raw
        $testId = [Guid]::NewGuid().ToString().ToUpperInvariant()
        $installDir = Join-Path $audit 'installed'
        $source = $source -replace '(?m)^AppId=.*$', ('AppId={{' + $testId + '}')
        $source = $source -replace '(?m)^DefaultDirName=.*$', ('DefaultDirName=' + $installDir)
        $source = $source.Replace('#define RepoRoot ".."', ('#define RepoRoot "' + $repo + '"'))
        $source = $source -replace '(?m)^CloseApplications=yes', 'CloseApplications=no'
        $source = $source -replace '(?ms)^\[Icons\].*\z', ''
        $testIss = Join-Path $audit 'isolated.iss'
        Set-Content -LiteralPath $testIss -Value $source -Encoding UTF8
        $compiler = @("$env:ProgramFiles\Inno Setup 7\ISCC.exe", "${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe",
            "$env:LOCALAPPDATA\Programs\Inno Setup 7\ISCC.exe", "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
            "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe") |
            Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        $version = (Get-Content -LiteralPath (Join-Path $build 'package-manifest.json') -Raw | ConvertFrom-Json).version
        $signCommand = '$q' + $shell.Replace('$', '$$') + '$q -NoProfile -ExecutionPolicy Bypass -File $q' + $signer.Replace('$', '$$') + '$q -FilePath $f'
        & $compiler '/Qp' ("/SComfileAzure=" + $signCommand) "/DAppVersion=$version" "/DPublishDirectory=$($manifest.publishDirectory)" "/DAppIconFileName=ComfileWEB-test.ico" "/DInstallerOutput=$audit\test-installer" $testIss
        if ($LASTEXITCODE -ne 0) { throw 'Isolated installer compilation failed.' }
        $testInstaller = (Get-ChildItem -LiteralPath (Join-Path $audit 'test-installer') -Filter '*.exe' | Where-Object Name -like 'ComfileWEB-Setup-*').FullName
        $null = Assert-ComfileSignature $testInstaller $tools.SignTool
        $process = Start-Process -FilePath $testInstaller -ArgumentList ('/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /NOICONS /LOG="' + (Join-Path $audit 'install.log') + '"') -WindowStyle Hidden -PassThru -Wait
        if ($process.ExitCode -ne 0) { throw "Isolated installation failed: $($process.ExitCode)" }
        $uninstaller = Join-Path $installDir 'unins000.exe'
        $null = Assert-ComfileSignature $uninstaller $tools.SignTool
        Copy-Item -LiteralPath $uninstaller -Destination (Join-Path $audit 'installed-uninstaller.exe')
        foreach ($file in $manifest.files | Where-Object { $_.path -notlike '*.pdb' -and $_.path -ne 'appsettings.Development.json' }) {
            $installedFile = Join-Path $installDir $file.path
            if ((Get-FileHash -LiteralPath $installedFile -Algorithm SHA256).Hash -ne $file.sha256) { throw "Installed file mismatch: $installedFile" }
            if ($file.companyOwned) { $null = Assert-ComfileSignature $installedFile $tools.SignTool }
        }
        # 설치 목록에 없는 사용자 파일이 제거 후 보존되는지 확인한다.
        $marker = Join-Path $installDir 'user-project-preservation.txt'
        [IO.File]::WriteAllText($marker, 'preserve-user-data')
        $process = Start-Process -FilePath $uninstaller -ArgumentList ('/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG="' + (Join-Path $audit 'uninstall.log') + '"') -WindowStyle Hidden -PassThru -Wait
        if ($process.ExitCode -ne 0) { throw "Isolated uninstall failed: $($process.ExitCode)" }
        if (Test-Path -LiteralPath $uninstaller) { throw 'Uninstaller remained after isolated uninstall.' }
        if ([IO.File]::ReadAllText($marker) -ne 'preserve-user-data') { throw 'User file was changed.' }
        if (Test-Path -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{$testId}_is1") { throw 'Isolated uninstall registration remained.' }
        Write-Host 'PASS: isolated install, installed uninstaller signature, uninstall.'
    }
    Write-Host "PASS: release signature, duplicate prevention, failure propagation, actual temporary child. Evidence: $audit"
} finally {
    foreach ($child in $children) { Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue }
    if ($launcher) { Stop-Process -Id $launcher.Id -Force -ErrorAction SilentlyContinue }
    Stop-Transcript | Out-Null
}
