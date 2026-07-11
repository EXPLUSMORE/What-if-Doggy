$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectPath = 'C:\Users\ch\Claude\Projects\What if Doggy'
$logFile = Join-Path $projectPath 'auto-push.log'
$scriptPath = Join-Path $projectPath 'auto-push.ps1'

if (-not (Test-Path $logFile)) {
    New-Item -ItemType File -Path $logFile -Force | Out-Null
}

$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logFile -Value "[$ts] Task started"

try {
    & $scriptPath
}
catch {
    $errTs = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$errTs] TASK ERROR: $($_.Exception.Message)"
    throw
}
