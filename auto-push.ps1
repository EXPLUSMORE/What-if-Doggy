# auto-push.ps1 – Läuft im Hintergrund via Windows Task Scheduler
# Committet und pusht automatisch alle Änderungen im What if Doggy Projekt

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectPath = 'C:\Users\ch\Claude\Projects\What if Doggy'
$logFile = Join-Path $projectPath 'auto-push.log'
$dryRun = ($env:AUTO_PUSH_DRY_RUN -eq '1')

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line
}

function Test-HasChanges {
    $status = git status --porcelain 2>&1
    return -not [string]::IsNullOrWhiteSpace(($status -join ''))
}

try {
    if (-not (Test-Path $projectPath)) {
        throw "Projektordner nicht gefunden: $projectPath"
    }

    if (-not (Test-Path $logFile)) {
        New-Item -ItemType File -Path $logFile -Force | Out-Null
    }

    Set-Location $projectPath
    Log 'Run started'

    if (-not (Test-Path '.git')) {
        throw "Kein Git-Repository gefunden in $projectPath"
    }

    git fetch --all --prune 2>&1 | Out-Null

    if (-not (Test-HasChanges)) {
        Log 'Keine Änderungen gefunden; nichts zu committen'
        exit 0
    }

    if ($dryRun) {
        Log 'Dry run aktiviert; Commit und Push werden übersprungen'
        exit 0
    }

    git add -A 2>&1 | Out-Null

    $stagedDiff = git diff --cached --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Log 'Es liegen keine neuen gestagten Änderungen vor; nichts zu committen'
        exit 0
    }

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
    $commitMsg = "chore: auto-save $timestamp"
    $commitOut = git commit -m $commitMsg 2>&1

    if ($LASTEXITCODE -ne 0) {
        Log "Commit fehlgeschlagen: $commitOut"
        exit 1
    }

    $remotes = git remote 2>&1
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($remotes -join ''))) {
        $pullOut = git pull --ff-only 2>&1
        if ($LASTEXITCODE -ne 0) {
            Log "Pull fehlgeschlagen: $pullOut"
            exit 1
        }

        $pushOut = git push 2>&1
        if ($LASTEXITCODE -ne 0) {
            Log "Push fehlgeschlagen: $pushOut"
            exit 1
        }
    }
    else {
        Log 'Keine Remote-Konfiguration gefunden; überspringe Push'
    }

    Log "OK - committed and pushed: $commitMsg"
}
catch {
    Log "FEHLER: $($_.Exception.Message)"
    exit 1
}
