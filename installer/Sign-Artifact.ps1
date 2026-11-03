[CmdletBinding()]
param([Parameter(Mandatory, Position = 0)][string]$FilePath, [switch]$VerifyOnly)

try {
    $env:PSModulePath = (Join-Path $PSHOME 'Modules') + ';' + $env:PSModulePath
    . (Join-Path $PSScriptRoot 'Signing.Common.ps1')
    $tools = Resolve-SigningTools
    $path = (Get-Item -LiteralPath $FilePath -ErrorAction Stop).FullName
    $metadata = Join-Path $PSScriptRoot 'Signing.Metadata.json'
    if ($VerifyOnly) {
        $null = Assert-ComfileSignature $path $tools.SignTool
        exit 0
    }
    $existing = Get-AuthenticodeSignature -LiteralPath $path
    if ($existing.Status -eq 'Valid') {
        $null = Assert-ComfileSignature $path $tools.SignTool
        Write-Host "Already signed: $path"
    } else {
        if ($existing.SignerCertificate) { throw "Refusing to replace an invalid existing signature: $path" }
        $inputHash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        $policyHash = (Get-FileHash -LiteralPath $metadata -Algorithm SHA256).Hash
        $cache = Join-Path (Split-Path -Parent $PSScriptRoot) "dist\SigningCache\$policyHash"
        $null = New-Item -ItemType Directory -Path $cache -Force
        $cached = Join-Path $cache ($inputHash + [IO.Path]::GetExtension($path))
        if (Test-Path -LiteralPath $cached) {
            $receipt = Get-Content -LiteralPath ($cached + '.json') -Raw | ConvertFrom-Json
            if ($receipt.inputHash -ne $inputHash -or $receipt.policyHash -ne $policyHash -or
                $receipt.signedHash -ne (Get-FileHash -LiteralPath $cached -Algorithm SHA256).Hash) {
                throw "Signing cache integrity check failed: $cached"
            }
            $null = Assert-ComfileSignature $cached $tools.SignTool
            Copy-Item -LiteralPath $cached -Destination $path -Force
            Write-Host "Reused verified signature: $path"
        } else {
            & $tools.SignTool sign /v /fd SHA256 /tr 'http://timestamp.acs.microsoft.com' /td SHA256 /dlib $tools.Dlib /dmdf $metadata $path
            if ($LASTEXITCODE -ne 0) { throw "Azure signing failed: $path (exit $LASTEXITCODE)" }
            $null = Assert-ComfileSignature $path $tools.SignTool
            $tempCache = $cached + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
            Copy-Item -LiteralPath $path -Destination $tempCache
            Move-Item -LiteralPath $tempCache -Destination $cached -Force
            [ordered]@{ inputHash = $inputHash; policyHash = $policyHash;
                signedHash = (Get-FileHash -LiteralPath $cached -Algorithm SHA256).Hash } |
                ConvertTo-Json | Set-Content -LiteralPath ($cached + '.json') -Encoding UTF8
        }
        $null = Assert-ComfileSignature $path $tools.SignTool
    }
    if ($env:COMFILEWEB_SIGNING_EVIDENCE) {
        $null = New-Item -ItemType Directory -Path $env:COMFILEWEB_SIGNING_EVIDENCE -Force
        $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        Copy-Item -LiteralPath $path -Destination (Join-Path $env:COMFILEWEB_SIGNING_EVIDENCE ($hash + '-' + [IO.Path]::GetFileName($path))) -Force
        [ordered]@{ path = $path; bytes = (Get-Item -LiteralPath $path).Length; sha256 = $hash; verifiedUtc = [DateTime]::UtcNow.ToString('o') } |
            ConvertTo-Json -Compress | Add-Content -LiteralPath (Join-Path $env:COMFILEWEB_SIGNING_EVIDENCE 'signatures.jsonl') -Encoding UTF8
    }
    exit 0
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
