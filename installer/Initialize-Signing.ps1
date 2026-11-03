[CmdletBinding()]
param([switch]$Login)
$ErrorActionPreference = 'Stop'
try {
    $env:PSModulePath = (Join-Path $PSHOME 'Modules') + ';' + $env:PSModulePath
    . (Join-Path $PSScriptRoot 'Signing.Common.ps1')
    $tools = Resolve-SigningTools
    $tools | Format-List | Out-Host
    & $tools.AzureCli account show --query state -o tsv
    $loggedIn = $LASTEXITCODE -eq 0
    if ($loggedIn) {
        & $tools.AzureCli account get-access-token --resource 'https://codesigning.azure.net' --query expiresOn -o tsv
        $loggedIn = $LASTEXITCODE -eq 0
    }
    if (-not $loggedIn) {
        if (-not $Login) { throw 'Azure login required. Run _Login-Signing.cmd.' }
        & $tools.AzureCli login --output none
        if ($LASTEXITCODE -ne 0) { throw 'Azure login failed.' }
        & $tools.AzureCli account get-access-token --resource 'https://codesigning.azure.net' --query expiresOn -o tsv
        if ($LASTEXITCODE -ne 0) { throw 'Azure signing authentication failed.' }
    }
    exit 0
} catch { Write-Error $_ -ErrorAction Continue; exit 1 }
