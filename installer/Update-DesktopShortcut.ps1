param([ValidatePattern('^ComfileWEB(?:-[A-Za-z0-9]+)?$')][string]$PublishFolderName = 'ComfileWEB')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
# 경로를 지정하지 않으면 마지막으로 성공한 빌드를 사용한다.
if (-not $PSBoundParameters.ContainsKey('PublishFolderName')) {
    $latestFile = Join-Path $repoRoot 'dist\latest-publish.txt'
    if (Test-Path -LiteralPath $latestFile) {
        $latestFolder = [IO.File]::ReadAllText($latestFile).Trim()
        if ($latestFolder -notmatch '^ComfileWEB(?:-[A-Za-z0-9]+)?$') { throw 'Invalid latest publish folder.' }
        $PublishFolderName = $latestFolder
    }
}
$publishDirectory = Join-Path $repoRoot ('dist\' + $PublishFolderName)
$executable = Join-Path $publishDirectory 'ComfileWeb.exe'
if (-not (Test-Path -LiteralPath $executable)) {
    throw 'Build the installer before updating the desktop shortcut.'
}

# 설치된 버전과 구분하고, 항상 작업 폴더에서 게시한 최신 실행 파일을 연다.
$iconSource = Join-Path $repoRoot 'Assets\AppIcon\ComfileWEB.ico'
$iconHash = (Get-FileHash -LiteralPath $iconSource -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
$iconPath = Join-Path $publishDirectory "ComfileWEB-$iconHash.ico"
Copy-Item -LiteralPath $iconSource -Destination $iconPath -Force
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'ComfileWEB (최신 빌드).lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $executable
$shortcut.WorkingDirectory = $publishDirectory
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'ComfileWEB - latest local build'
$shortcut.Save()
$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $executable -or $verified.IconLocation -ne "$iconPath,0") {
    throw 'Desktop shortcut verification failed.'
}
Write-Host "Updated: $shortcutPath"
