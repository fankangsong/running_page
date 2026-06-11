# Restart Strava Sync - Clean up and start fresh
param(
    [switch]$Monitor,
    [int]$Delay = 900
)

$ErrorActionPreference = "Stop"
$logFile = "strava_sync.log"
$progressFile = "strava_sync_progress.json"

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "🔄 Restarting Strava Sync" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

# Stop any existing jobs
Write-Host "Checking for existing jobs..." -ForegroundColor Yellow
$existingJobs = Get-Job -Name "StravaSync" -ErrorAction SilentlyContinue
if ($existingJobs) {
    Write-Host "  Stopping existing job: $($existingJobs.Name)" -ForegroundColor Red
    $existingJobs | Stop-Job
    $existingJobs | Remove-Job
    Write-Host "  ✅ Old job removed" -ForegroundColor Green
} else {
    Write-Host "  No existing jobs found" -ForegroundColor Gray
}
Write-Host ""

# Clean up old files
Write-Host "Cleaning up old files..." -ForegroundColor Yellow
if (Test-Path $logFile) {
    Remove-Item $logFile -Force
    Write-Host "  ✅ Deleted: $logFile" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  $logFile not found (skipping)" -ForegroundColor Gray
}

if (Test-Path $progressFile) {
    Remove-Item $progressFile -Force
    Write-Host "  ✅ Deleted: $progressFile" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  $progressFile not found (skipping)" -ForegroundColor Gray
}
Write-Host ""

# Wait reminder
Write-Host "⚠️  IMPORTANT: Strava API rate limit is currently active (429 error)" -ForegroundColor Yellow
Write-Host "   You need to wait 15-30 minutes before retrying." -ForegroundColor Yellow
Write-Host ""
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "  1. Start sync now (will retry automatically on rate limit)" -ForegroundColor Gray
Write-Host "  2. Wait 15 minutes, then run this script again" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Start sync now? (y/n)"
if ($choice -ne 'y' -and $choice -ne 'Y') {
    Write-Host ""
    Write-Host "❌ Sync cancelled. Run this script again when ready." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Starting sync..." -ForegroundColor Green
Write-Host ""

# Start the sync
.\start_strava_sync.ps1 -Monitor:$Monitor -Delay $Delay
