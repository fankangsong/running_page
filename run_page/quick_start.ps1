# Strava Sync - 快速启动脚本（前台模式，便于调试）
# Usage: .\quick_start.ps1 [-Preview] [-Execute]

param(
    [switch]$Preview,
    [switch]$Execute,
    [int]$BatchSize = 0,
    [int]$Delay = 900
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "run_page\strava_sync_scheduler.py"

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "Strava Sync Scheduler - Quick Start" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python not found in PATH" -ForegroundColor Red
    exit 1
}

# Build command
$command = "python `"$scriptPath`""

if ($Preview) {
    $command += " --preview"
} elseif ($Execute) {
    $command += " --execute"

    if ($BatchSize -gt 0) {
        $command += " --batch-size $BatchSize"
    }

    if ($Delay -ne 900) {
        $command += " --delay $Delay"
    }
} else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  Preview:  .\quick_start.ps1 -Preview" -ForegroundColor Cyan
    Write-Host "  Execute:  .\quick_start.ps1 -Execute" -ForegroundColor Cyan
    Write-Host "  Custom:   .\quick_start.ps1 -Execute -BatchSize 50 -Delay 1800" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Script: $scriptPath" -ForegroundColor Gray

if ($Preview) {
    Write-Host "  Mode: Preview (no execution)" -ForegroundColor Green
} else {
    Write-Host "  Mode: Execute" -ForegroundColor Green
    Write-Host "  Batch size: $(if ($BatchSize -gt 0) { $BatchSize } else { 'auto' })" -ForegroundColor Gray
    Write-Host "  Delay: $Delay seconds ($([math]::Round($Delay/60, 1)) minutes)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Command: $command" -ForegroundColor Gray
Write-Host ""

# Execute directly (foreground)
Write-Host "Starting..." -ForegroundColor Green
Write-Host ""

Invoke-Expression $command

Write-Host ""
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan
