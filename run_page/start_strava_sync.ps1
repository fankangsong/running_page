# Strava Sync - PowerShell Background Runner
# Usage: .\start_strava_sync.ps1 [-Preview] [-Monitor]

param(
    [switch]$Preview,
    [switch]$Monitor,
    [int]$BatchSize = 0,  # 0 means auto-calculate
    [int]$Delay = 900     # Default 15 minutes
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "run_page\strava_sync_scheduler.py"
$progressFile = "strava_sync_progress.json"
$logFile = "strava_sync.log"

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "🏃 Strava Sync Scheduler - Background Runner" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Python not found in PATH" -ForegroundColor Red
    exit 1
}

# Build command
$command = "python `"$scriptPath`""

if ($Preview) {
    $command += " --preview"
} else {
    $command += " --execute"

    if ($BatchSize -gt 0) {
        $command += " --batch-size $BatchSize"
    }

    if ($Delay -ne 900) {
        $command += " --delay $Delay"
    }
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Script: $scriptPath" -ForegroundColor Gray
Write-Host "  Progress file: $progressFile" -ForegroundColor Gray
Write-Host "  Log file: $logFile" -ForegroundColor Gray

if (-not $Preview) {
    Write-Host "  Batch size: $(if ($BatchSize -gt 0) { $BatchSize } else { 'auto' })" -ForegroundColor Gray
    Write-Host "  Delay: $Delay seconds ($([math]::Round($Delay/60, 1)) minutes)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Command: $command" -ForegroundColor Gray
Write-Host ""

if ($Preview) {
    # Preview mode - run directly
    Write-Host "Running preview..." -ForegroundColor Green
    Write-Host ""
    Invoke-Expression $command
} else {
    # Execute mode - run in background
    Write-Host "Starting background sync..." -ForegroundColor Green
    Write-Host ""

    # Create background job
    $job = Start-Job -ScriptBlock {
        param($cmd, $log)

        # Change to script directory
        Set-Location (Split-Path $MyInvocation.MyCommand.Path -Parent)

        # Run command and log output
        $output = & cmd /c $cmd 2>&1
        $output | Out-File -FilePath $log -Encoding UTF8
        $output

    } -ArgumentList $command, $logFile -Name "StravaSync"

    Write-Host "✅ Background job started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Job Details:" -ForegroundColor Yellow
    Write-Host "  Job ID: $($job.Id)" -ForegroundColor Gray
    Write-Host "  Job Name: $($job.Name)" -ForegroundColor Gray
    Write-Host "  State: $($job.State)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Yellow
    Write-Host "  View status: Get-Job -Name 'StravaSync'" -ForegroundColor Cyan
    Write-Host "  View output: Receive-Job -Name 'StravaSync'" -ForegroundColor Cyan
    Write-Host "  Stop job: Stop-Job -Name 'StravaSync'" -ForegroundColor Cyan
    Write-Host "  Remove job: Remove-Job -Name 'StravaSync'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitoring:" -ForegroundColor Yellow

    if ($Monitor) {
        Write-Host "  Starting progress monitor..." -ForegroundColor Green
        Write-Host ""

        # Wait for progress file to be created
        $timeout = 60
        $elapsed = 0
        while (-not (Test-Path $progressFile) -and $elapsed -lt $timeout) {
            Write-Host "`r  Waiting for sync to start... ($($timeout - $elapsed)s remaining)" -ForegroundColor Yellow -NoNewline
            Start-Sleep -Seconds 1
            $elapsed++
        }

        if (Test-Path $progressFile) {
            Write-Host "`r" -NoNewline
            # Start monitoring
            python (Join-Path $PSScriptRoot "monitor_strava_sync.py") --file $progressFile
        } else {
            Write-Host "`r  ⚠️  Progress file not created within ${timeout}s" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  To monitor progress: python monitor_strava_sync.py" -ForegroundColor Cyan
    }

    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "Logs will be saved to: $logFile" -ForegroundColor Gray
    Write-Host ("=" * 70) -ForegroundColor Cyan
}
