$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-SigningTools {
    $sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    $signTool = $env:COMFILEWEB_SIGNTOOL
    if (-not $signTool -and (Test-Path -LiteralPath $sdkRoot)) {
        $signTool = Get-ChildItem -LiteralPath $sdkRoot -Filter signtool.exe -Recurse -File |
            Where-Object { $_.Directory.Name -eq 'x64' } |
            Sort-Object { [version]$_.VersionInfo.ProductVersion.Split(' ')[0] } -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }
    $dlib = $env:COMFILEWEB_SIGNING_DLIB
    if (-not $dlib) {
        $dlib = Join-Path $env:LOCALAPPDATA 'Microsoft\MicrosoftArtifactSigningClientTools\Azure.CodeSigning.Dlib.dll'
    }
    foreach ($file in @($signTool, $dlib)) {
        if (-not $file -or -not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw 'Signing tools missing. Run installer\Initialize-Signing.ps1 or set COMFILEWEB_SIGNTOOL and COMFILEWEB_SIGNING_DLIB (x64).'
        }
    }
    if ([version](Get-Item -LiteralPath $signTool).VersionInfo.ProductVersion.Split(' ')[0] -lt [version]'10.0.22621.0') {
        throw 'Artifact Signing requires Windows SDK SignTool 10.0.22621.0 or newer.'
    }
    $az = Get-Command az.cmd -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
    if (-not $az) {
        foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
            $candidate = Join-Path $root 'Microsoft SDKs\Azure\CLI2\wbin\az.cmd'
            if (Test-Path -LiteralPath $candidate) { $az = $candidate; break }
        }
    }
    if (-not $az) { throw 'Azure CLI is missing. Run installer\Initialize-Signing.ps1.' }
    $env:PATH = (Split-Path -Parent $az) + ';' + $env:PATH
    [pscustomobject]@{ SignTool = $signTool; Dlib = $dlib; AzureCli = $az }
}

function Assert-ComfileSignature([string]$Path, [string]$SignTool) {
    & $SignTool verify /pa /all /v /tw $Path | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw "Authenticode verification failed: $Path (exit $LASTEXITCODE)" }
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or
        $signature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) -cne 'COMFILE Technology, Inc.' -or
        -not $signature.TimeStamperCertificate) {
        throw "Expected valid timestamped COMFILE Technology, Inc. signature: $Path ($($signature.Status))"
    }
    return $signature
}
