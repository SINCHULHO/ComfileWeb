param([ValidatePattern('^ComfileWEB(?:-[A-Za-z0-9]+)?$')][string]$PublishFolderName = 'ComfileWEB')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

try {
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
        'ComfileWeb.exe', 'ComfileWeb.dll', 'ComfileWeb.runtimeconfig.json', 'coreclr.dll',
        'appsettings.json', 'wwwroot\index.html', 'wwwroot\visualization.js',
        'wwwroot\visualization.css', 'wwwroot\visualization-addresses.js',
        'wwwroot\visualization-device-link.js', 'wwwroot\visualization.ldmonitor.js',
        'wwwroot\comfileweb.js', 'wwwroot\comfileweb-mcp.js', 'wwwroot\comfileweb-update.js', 'Mcp\README.md',
        'ComfileTech.Cfnet.Cfheader.Native.dll', 'libusb-1.0.dll'
    )) {
        if (-not (Test-Path -LiteralPath (Join-Path $publishDirectory $requiredFile))) {
            throw "Published package is incomplete: $requiredFile"
        }
    }

    Write-Host '[3/3] Creating installer...'
    # 아이콘 내용이 바뀌면 파일명도 바꿔 Windows의 이전 아이콘 캐시를 피한다.
    $iconHash = (Get-FileHash -LiteralPath (Join-Path $repoRoot 'Assets\AppIcon\ComfileWEB.ico') -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
    $appIconFileName = "ComfileWEB-$iconHash.ico"
    & $compiler "/DPublishDirectory=$publishDirectory" "/DAppVersion=$appVersion" "/DAppIconFileName=$appIconFileName" (Join-Path $PSScriptRoot 'ComfileWEB.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
    $installerPath = Join-Path $repoRoot "dist\installer\ComfileWEB-Setup-$appVersion-win-x64.exe"
    if (-not (Test-Path -LiteralPath $installerPath)) { throw 'Installer output was not created.' }
    # 성공한 빌드 경로를 기록하고 바로가기도 같은 배포본으로 갱신한다.
    & (Join-Path $PSScriptRoot 'Update-DesktopShortcut.ps1') -PublishFolderName $PublishFolderName
    [IO.File]::WriteAllText((Join-Path $distDirectory 'latest-publish.txt'), $PublishFolderName)
    # 정리 실패가 이미 완성된 설치 파일을 빌드 실패로 바꾸지는 않는다.
    try { & (Join-Path $PSScriptRoot 'Cleanup-Builds.ps1') -KeepLatest 3 }
    catch { Write-Warning "Old build cleanup skipped: $($_.Exception.Message)" }
    Write-Host "SUCCESS: $installerPath" -ForegroundColor Green
}
catch {
    Write-Host "BUILD FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
