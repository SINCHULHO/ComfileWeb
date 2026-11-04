[CmdletBinding()]
param([switch]$ValidateOnly)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repoRoot = Split-Path -Parent $PSScriptRoot
$account = 'comfiletechdownloads'
$container = '$web'
$prefix = 'ComfileWEB'

try {
    [xml]$props = Get-Content -LiteralPath (Join-Path $repoRoot 'ComfileWebVersion.props') -Raw
    $version = [string]$props.Project.PropertyGroup.ComfileWebVersion
    $build = [string]$props.Project.PropertyGroup.ComfileWebBuild
    if ($version -notmatch '\A[0-9]+\.[0-9]+\z' -or $build -notmatch '\A[0-9]{1,5}\z' -or [int]$build -gt 65534) {
        throw 'Invalid ComfileWebVersion.props.'
    }
    $name = "ComfileWEB-Setup-$version.$build-win-x64.exe"
    $installer = Join-Path $repoRoot "dist\installer\$name"
    $checksum = $installer + '.sha256'
    foreach ($file in @($installer, $checksum)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Missing release file: $file. Run _Build-Installer.cmd first."
        }
    }
    $hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash
    $expected = (Get-Content -LiteralPath $checksum -Raw).Trim()
    if ($expected -ine "$hash  $name") { throw 'Installer checksum mismatch. Rebuild the installer.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or
        $signature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) -cne 'COMFILE Technology, Inc.' -or
        -not $signature.TimeStamperCertificate) {
        throw 'Installer must have a valid timestamped COMFILE Technology, Inc. signature.'
    }
    Write-Host "Installer: $name"
    Write-Host ('Destination: https://{0}.blob.core.windows.net/{1}/{2}/' -f $account, $container, $prefix)
    if ($ValidateOnly) { Write-Host 'Local validation passed; nothing uploaded.'; exit 0 }

    $az = Get-Command az.cmd -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
    if (-not $az) {
        foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
            $candidate = Join-Path $root 'Microsoft SDKs\Azure\CLI2\wbin\az.cmd'
            if (Test-Path -LiteralPath $candidate) { $az = $candidate; break }
        }
    }
    if (-not $az) { throw 'Azure CLI not found. Run installer\Initialize-Signing.ps1.' }
    & $az account show --output none --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw 'Azure login required. Run _Login-Signing.cmd, then retry.' }
    $common = @('--account-name', $account, '--container-name', $container, '--auth-mode', 'login', '--only-show-errors')

    # EXE first, checksum second. A retry skips only files with the same hash and size.
    foreach ($file in @($installer, $checksum)) {
        $info = Get-Item -LiteralPath $file
        $blob = "$prefix/$($info.Name)"
        $fileHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
        $exists = & $az storage blob exists @common --name $blob --query exists --output tsv
        if ($LASTEXITCODE -ne 0) {
            throw 'Cannot access Blob Storage. The signed-in account needs Storage Blob Data Contributor on this container/account.'
        }
        if (($exists | Out-String).Trim() -eq 'true') {
            $json = & $az storage blob show @common --name $blob --output json
            if ($LASTEXITCODE -ne 0) { throw "Could not inspect existing blob: $blob" }
            $remote = ($json | Out-String) | ConvertFrom-Json
            $remoteHash = $null
            if ($remote.metadata -and $remote.metadata.PSObject.Properties['sha256']) { $remoteHash = $remote.metadata.sha256 }
            if ($remoteHash -eq $fileHash -and [long]$remote.properties.contentLength -eq $info.Length) {
                Write-Host "Already uploaded: $($info.Name)"
                continue
            }
            throw "A different or unverified file already exists: $blob. It was not overwritten."
        }
        $contentType = if ($info.Extension -eq '.exe') { 'application/octet-stream' } else { 'text/plain' }
        Write-Host "Uploading: $($info.Name)"
        & $az storage blob upload @common --name $blob --file $file --type block --overwrite false `
            --content-type $contentType --metadata "sha256=$fileHash" --output none
        if ($LASTEXITCODE -ne 0) { throw "Upload failed: $($info.Name). Retry _Upload-Installer.cmd." }
        $length = & $az storage blob show @common --name $blob --query properties.contentLength --output tsv
        if ($LASTEXITCODE -ne 0 -or [long](($length | Out-String).Trim()) -ne $info.Length) {
            throw "Remote size verification failed: $blob"
        }
    }
    Write-Host ('SUCCESS: https://{0}.blob.core.windows.net/{1}/{2}/{3}' -f $account, $container, $prefix, $name)
    exit 0
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
