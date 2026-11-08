param([ValidatePattern('^ComfileWEB(?:-[A-Za-z0-9]+)?$')][string]$PublishFolderName = 'ComfileWEB')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$previousEvidence = $env:COMFILEWEB_SIGNING_EVIDENCE
$compiledOutput = $null
$staging = $null
$transcribing = $false

try {
    $env:PSModulePath = (Join-Path $PSHOME 'Modules') + ';' + $env:PSModulePath
    . (Join-Path $PSScriptRoot 'Signing.Common.ps1')
    $signingTools = Resolve-SigningTools
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $signScript = Join-Path $PSScriptRoot 'Sign-Artifact.ps1'
    & $powerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Initialize-Signing.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Signing initialization failed. Run _Login-Signing.cmd if login is required.' }
    $runId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $runRoot = Join-Path $repoRoot "dist\InstallerBuilds\$runId"
    $compiledOutput = Join-Path $runRoot 'installer'
    $null = New-Item -ItemType Directory -Path $compiledOutput -Force
    $env:COMFILEWEB_SIGNING_EVIDENCE = Join-Path $runRoot 'signing-evidence'
    Start-Transcript -LiteralPath (Join-Path $runRoot 'build.log') | Out-Null
    $transcribing = $true
    [xml]$versionProps = Get-Content -LiteralPath (Join-Path $repoRoot 'ComfileWebVersion.props') -Raw
    $releaseVersion = [string]$versionProps.Project.PropertyGroup.ComfileWebVersion
    $buildNumber = [string]$versionProps.Project.PropertyGroup.ComfileWebBuild
    if ($releaseVersion -notmatch '\A\d+\.\d+\z' -or $buildNumber -notmatch '\A\d{1,5}\z' -or [int]$buildNumber -gt 65534) {
        throw 'ComfileWebVersion.props must specify a version such as 0.9 and a build number from 0 to 65534.'
    }
    $appVersion = "$releaseVersion.$buildNumber"
    $null = Get-Command dotnet -ErrorAction Stop
    $compilerPaths = @(
        "$env:ProgramFiles\Inno Setup 7\ISCC.exe"
        "${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe"
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
        "$env:LOCALAPPDATA\Programs\Inno Setup 7\ISCC.exe"
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
    )
    $compiler = $compilerPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $compiler) {
        $command = Get-Command ISCC.exe -ErrorAction SilentlyContinue
        if ($command) { $compiler = $command.Source }
    }
    if (-not $compiler) { throw 'Install Inno Setup 6 or 7 (ISCC.exe) before building the installer.' }

    $publishDirectory = [IO.Path]::GetFullPath((Join-Path $repoRoot ('dist\' + $PublishFolderName)))
    $distDirectory = [IO.Path]::GetFullPath((Join-Path $repoRoot 'dist'))
    # 실행 중인 앱이나 MCP가 DLL을 사용해도 기존 배포 폴더는 삭제하지 않는다.
    # 매번 빈 폴더에 게시하여 이전 파일이 설치본에 섞이지 않도록 한다.
    if (Test-Path -LiteralPath $publishDirectory) {
        $PublishFolderName = 'ComfileWEB-' + $buildNumber + [Guid]::NewGuid().ToString('N').Substring(0, 12)
        $publishDirectory = [IO.Path]::GetFullPath((Join-Path $distDirectory $PublishFolderName))
        Write-Host "Existing build preserved. Publishing to: $publishDirectory"
    }
    if ((Split-Path -Parent $publishDirectory) -ne $distDirectory -or (Split-Path -Leaf $publishDirectory) -ne $PublishFolderName) {
        throw 'Unexpected publish directory.'
    }

    Write-Host '[1/3] Publishing ComfileWEB with the .NET runtime...'
    & dotnet publish (Join-Path $repoRoot 'ComfileWeb\ComfileWeb.csproj') -c Release -r win-x64 --self-contained true -o $publishDirectory
    if ($LASTEXITCODE -ne 0) { throw 'ComfileWEB publish failed.' }

    Write-Host '[2/3] Checking published files...'
    foreach ($requiredFile in @(
        'ComfileWeb.exe', 'ComfileWeb.dll', 'Reporting.dll', 'ComfileWeb.runtimeconfig.json', 'coreclr.dll',
        'appsettings.json', 'wwwroot\index.html', 'wwwroot\visualization.js',
        'wwwroot\visualization.css', 'wwwroot\visualization-addresses.js',
        'wwwroot\visualization-device-link.js', 'wwwroot\visualization.ldmonitor.js',
        'wwwroot\comfileweb-reports.js', 'wwwroot\comfileweb-reports.css', 'wwwroot\comfileweb.js', 'wwwroot\comfileweb-mcp.js', 'wwwroot\comfileweb-update.js', 'wwwroot\comfileweb-ai.js', 'Mcp\README.md',
        'ComfileTech.Cfnet.Cfheader.Native.dll', 'libusb-1.0.dll'
    )) {
        if (-not (Test-Path -LiteralPath (Join-Path $publishDirectory $requiredFile))) {
            throw "Published package is incomplete: $requiredFile"
        }
    }

    # 회사 패키지 저작자와 프로젝트 출력으로 확인한 파일만 서명한다.
    $ownedNames = @('ComfileWeb.exe', 'ComfileWeb.dll', 'Reporting.dll', 'ComfileTech.Cfnet.Cfheader.dll', 'ComfileTech.Cfnet.Cfheader.Native.dll')
    $payloadFiles = @(Get-ChildItem -LiteralPath $publishDirectory -Recurse -File)
    $thirdPartyHashes = @{}
    foreach ($file in $payloadFiles | Where-Object { $_.Extension -in @('.exe','.dll') -and $_.Name -notin $ownedNames }) {
        $thirdPartyHashes[$file.FullName] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
    foreach ($name in $ownedNames) {
        $file = Join-Path $publishDirectory $name
        & $powerShell -NoProfile -ExecutionPolicy Bypass -File $signScript -FilePath $file
        if ($LASTEXITCODE -ne 0) { throw "Payload signing failed: $file" }
    }
    $fileHashes = foreach ($file in $payloadFiles) {
        $file.Refresh()
        $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        if ($thirdPartyHashes.ContainsKey($file.FullName) -and $thirdPartyHashes[$file.FullName] -ne $hash) { throw "Third-party file changed: $file" }
        [ordered]@{ path = $file.FullName.Substring($publishDirectory.Length + 1); bytes = $file.Length; sha256 = $hash; companyOwned = $file.Name -in $ownedNames }
    }
    [ordered]@{ version = $appVersion; publishDirectory = $publishDirectory; compiler = $compiler;
        signTool = $signingTools.SignTool; dlib = $signingTools.Dlib; files = @($fileHashes) } |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $runRoot 'package-manifest.json') -Encoding UTF8
    Write-Host '[3/3] Creating signed installer...'
    # 아이콘 내용이 바뀌면 파일명도 바꿔 Windows의 이전 아이콘 캐시를 피한다.
    $iconHash = (Get-FileHash -LiteralPath (Join-Path $repoRoot 'Assets\AppIcon\ComfileWEB.ico') -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
    $appIconFileName = "ComfileWEB-$iconHash.ico"
    # $f는 이미 따옴표로 감싼 경로이므로 추가로 인용하지 않는다.
    $signCommand = '$q' + $powerShell.Replace('$', '$$') + '$q -NoProfile -ExecutionPolicy Bypass -File $q' + $signScript.Replace('$', '$$') + '$q -FilePath $f'
    & $compiler '/Qp' ("/SComfileAzure=" + $signCommand) "/DInstallerOutput=$compiledOutput" "/DPublishDirectory=$publishDirectory" "/DAppVersion=$appVersion" "/DAppIconFileName=$appIconFileName" (Join-Path $PSScriptRoot 'ComfileWEB.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
    $name = "ComfileWEB-Setup-$appVersion-win-x64.exe"
    $builtInstaller = Join-Path $compiledOutput $name
    $null = Assert-ComfileSignature $builtInstaller $signingTools.SignTool
    $installerHash = (Get-FileHash -LiteralPath $builtInstaller -Algorithm SHA256).Hash
    $releaseFolder = Join-Path $repoRoot 'dist\installer'
    $null = New-Item -ItemType Directory -Path $releaseFolder -Force
    $installerPath = Join-Path $releaseFolder $name
    $staging = Join-Path $releaseFolder "$name.$runId.tmp"
    Copy-Item -LiteralPath $builtInstaller -Destination $staging
    if ((Get-FileHash -LiteralPath $staging -Algorithm SHA256).Hash -ne $installerHash) { throw 'Installer copy hash mismatch.' }
    # 검증 완료 후에만 정식 배포 파일을 원자적으로 교체한다.
    if (Test-Path -LiteralPath $installerPath) { [IO.File]::Replace($staging, $installerPath, (Join-Path $runRoot 'previous-installer.exe')) }
    else { [IO.File]::Move($staging, $installerPath) }
    "$installerHash  $name" | Set-Content -LiteralPath (Join-Path $releaseFolder "$name.sha256") -Encoding ASCII
    # 성공한 빌드 경로를 기록하고 바로가기도 같은 배포본으로 갱신한다.
    & (Join-Path $PSScriptRoot 'Update-DesktopShortcut.ps1') -PublishFolderName $PublishFolderName
    [IO.File]::WriteAllText((Join-Path $distDirectory 'latest-publish.txt'), $PublishFolderName)
    # 정리 실패가 이미 완성된 설치 파일을 빌드 실패로 바꾸지는 않는다.
    try { & (Join-Path $PSScriptRoot 'Cleanup-Builds.ps1') -KeepLatest 3 }
    catch { Write-Warning "Old build cleanup skipped: $($_.Exception.Message)" }
    Write-Host "SUCCESS: $installerPath" -ForegroundColor Green
}
catch {
    if ($compiledOutput -and (Test-Path -LiteralPath $compiledOutput)) {
        Get-ChildItem -LiteralPath $compiledOutput -File -Filter '*.exe' | Remove-Item -Force
    }
    if ($staging -and (Test-Path -LiteralPath $staging)) { Remove-Item -LiteralPath $staging -Force }
    Write-Host "BUILD FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    $env:COMFILEWEB_SIGNING_EVIDENCE = $previousEvidence
    if ($transcribing) { Stop-Transcript | Out-Null }
}
