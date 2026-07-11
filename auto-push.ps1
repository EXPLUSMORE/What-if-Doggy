# auto-push.ps1 – Läuft im Hintergrund via Windows Task Scheduler
# Committet und pusht automatisch alle Änderungen im What if Doggy Projekt

$projectPath = 'C:\Users\ch\Claude\Projects\What if Doggy'
$logFile = Join-Path $projectPath 'auto-push.log'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line
}

if (-not (Test-Path $projectPath)) {
    Write-Error "Projektordner nicht gefunden: $projectPath"
    exit 1
}

if (-not (Test-Path $logFile)) {
    New-Item -ItemType File -Path $logFile -Force | Out-Null
}

Set-Location $projectPath
Log 'Run started'

if (-not (Test-Path '.git')) {
    Log "FEHLER: Kein Git-Repository gefunden in $projectPath"
    exit 1
}

$status = git status --porcelain 2>&1
if ([string]::IsNullOrWhiteSpace(($status -join ""))) {
    Log 'Keine Änderungen gefunden; nichts zu committen'
    exit 0
}

git add -A 2>&1 | Out-Null
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$commitMsg = "chore: auto-save $timestamp"
$commitOut = git commit -m $commitMsg 2>&1

if ($LASTEXITCODE -ne 0) {
    Log "Commit fehlgeschlagen: $commitOut"
    exit 1
}

$pushOut = git push 2>&1
if ($LASTEXITCODE -ne 0) {
    Log "Push fehlgeschlagen: $pushOut"
    exit 1
}

Log "OK - committed and pushed: $commitMsg"
