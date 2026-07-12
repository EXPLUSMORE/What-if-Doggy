# auto-push.ps1 – Läuft im Hintergrund via Windows Task Scheduler
# Committet und pusht automatisch alle Änderungen im What if Doggy Projekt

# KEIN ErrorActionPreference = Stop – git schreibt Warnings auf stderr,
# die PowerShell sonst als Fehler behandelt.

$projectPath = 'C:\Users\ch\Claude\Projects\What if Doggy'
$logFile     = Join-Path $projectPath 'auto-push.log'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$ts] $msg"
}

# git-Befehl ausführen, alle Ausgaben sammeln, Exit-Code prüfen
function Invoke-Git {
    param([string[]]$args)
    $out = & git @args 2>&1
    return [PSCustomObject]@{ Output = $out -join "`n"; Ok = ($LASTEXITCODE -eq 0) }
}

Set-Location $projectPath

if (-not (Test-Path '.git')) {
    Log "FEHLER: Kein Git-Repository in $projectPath"
    exit 1
}

# Änderungen vorhanden?
$status = (& git status --porcelain 2>&1) -join ''
if ([string]::IsNullOrWhiteSpace($status)) {
    # Nichts zu tun – kein Log
    exit 0
}

# Staging
& git add -A 2>&1 | Out-Null

# Prüfen ob nach Staging wirklich etwas staged ist
& git diff --cached --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    # Alles schon committed
    exit 0
}

# Commit
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$commitMsg = "chore: auto-save $timestamp"
$r = Invoke-Git 'commit', '-m', $commitMsg
if (-not $r.Ok) {
    Log "Commit fehlgeschlagen: $($r.Output)"
    exit 1
}

# Push
$r = Invoke-Git 'push'
if (-not $r.Ok) {
    Log "Push fehlgeschlagen: $($r.Output)"
    exit 1
}

Log "OK – committed & pushed: $commitMsg"
