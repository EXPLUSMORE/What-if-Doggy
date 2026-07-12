# auto-push.ps1 - Laeuft im Hintergrund via Windows Task Scheduler
# Committet und pusht automatisch alle Aenderungen im What if Doggy Projekt

$projectPath = 'C:\Users\ch\Claude\Projects\What if Doggy'
$logFile     = Join-Path $projectPath 'auto-push.log'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$ts] $msg"
}

function Invoke-Git {
    param([string[]]$gitArgs)
    $out = & git @gitArgs 2>&1
    return [PSCustomObject]@{ Output = $out -join "`n"; Ok = ($LASTEXITCODE -eq 0) }
}

Set-Location $projectPath

if (-not (Test-Path '.git')) {
    Log "FEHLER: Kein Git-Repository in $projectPath"
    exit 1
}

# Lock-Handling: verhindert Konflikte wenn Sandbox oder anderer Prozess git benutzt.
# Junger Lock (< 60s) = anderer Prozess laeuft gerade  -> ruhig abwarten, nichts tun.
# Alter Lock  (> 60s) = Crash-Ueberbleibsel            -> aufraumen und weitermachen.
$lockFiles = @('.git\index.lock', '.git\HEAD.lock', '.git\refs\heads\main.lock')
foreach ($lockFile in $lockFiles) {
    $lockPath = Join-Path $projectPath $lockFile
    if (Test-Path $lockPath) {
        $age = (Get-Date) - (Get-Item $lockPath).LastWriteTime
        if ($age.TotalSeconds -lt 60) {
            # Aktiver Prozess - nicht stoeren
            exit 0
        }
        # Staler Lock - entfernen
        Remove-Item -Force $lockPath -ErrorAction SilentlyContinue
        Log "Staler Lock entfernt: $lockFile ($([int]$age.TotalSeconds)s alt)"
    }
}

# Aenderungen vorhanden?
$status = (& git status --porcelain 2>&1) -join ''
if ([string]::IsNullOrWhiteSpace($status)) {
    exit 0
}

# Staging
& git add -A 2>&1 | Out-Null

# Pruefen ob nach Staging wirklich etwas staged ist
& git diff --cached --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
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

Log "OK: $commitMsg"
