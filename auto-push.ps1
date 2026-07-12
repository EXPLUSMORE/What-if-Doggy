# auto-push.ps1 - Laeuft via Windows Task Scheduler alle 10 Minuten

$projectPath = 'C:\Users\ch\Claude\Projects\What if Doggy'
$logFile     = Join-Path $projectPath 'auto-push.log'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$ts] $msg"
}

function Invoke-Git([string[]]$gitArgs) {
    $out = & git @gitArgs 2>&1
    # Nur echter Fehler (Exit != 0); Warnings (CRLF etc.) ignorieren
    $errors = $out | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] }
    $text   = ($out | ForEach-Object { "$_" }) -join "`n"
    return [PSCustomObject]@{ Output = $text; Ok = ($LASTEXITCODE -eq 0); Errors = $errors }
}

Set-Location $projectPath
Log "Gestartet"

if (-not (Test-Path '.git')) {
    Log "FEHLER: Kein Git-Repository"
    exit 1
}

# Lock-Handling:
#   Lock < 60s  -> anderer Prozess laeuft gerade -> abwarten, ruhig beenden
#   Lock >= 60s -> Crash-Ueberbleibsel           -> aufraumen und weitermachen
$lockFiles = @('.git\index.lock', '.git\HEAD.lock', '.git\refs\heads\main.lock')
foreach ($lockFile in $lockFiles) {
    $lockPath = Join-Path $projectPath $lockFile
    if (Test-Path $lockPath) {
        $age = (Get-Date) - (Get-Item $lockPath).LastWriteTime
        if ($age.TotalSeconds -lt 60) {
            Log "Uebersprungen: aktiver Lock '$lockFile' ($([int]$age.TotalSeconds)s alt)"
            exit 0
        }
        Remove-Item -Force $lockPath -ErrorAction SilentlyContinue
        Log "Staler Lock entfernt: '$lockFile' ($([int]$age.TotalSeconds)s alt)"
    }
}

# Aenderungen vorhanden?
$status = (& git status --porcelain 2>&1) -join ''
if ([string]::IsNullOrWhiteSpace($status)) {
    Log "Keine Aenderungen"
    exit 0
}

# Staging (CRLF-Warnings werden unterdrueckt)
& git add -A 2>&1 | Out-Null

# Nichts staged?
& git diff --cached --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Log "Keine Aenderungen (nach Staging)"
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
