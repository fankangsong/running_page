# PowerShell build script for running_page
# Usage: .\build.ps1

# Set error handling
$ErrorActionPreference = "Stop"

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Page Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Environment variables loaded." -ForegroundColor Green
} else {
    Write-Host "No .env file found, skipping environment setup." -ForegroundColor Gray
}

# Pull latest changes
Write-Host ""
Write-Host "Pulling latest changes from git..." -ForegroundColor Yellow
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Git pull completed." -ForegroundColor Green

# Sync Strava data
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Syncing Strava data..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

if ($env:STRAVA_CLIENT_ID -and $env:STRAVA_CLIENT_SECRET -and $env:STRAVA_REFRESH_TOKEN) {
    Write-Host "Starting Strava sync..." -ForegroundColor Yellow
    python run_page/strava_sync.py $env:STRAVA_CLIENT_ID $env:STRAVA_CLIENT_SECRET $env:STRAVA_REFRESH_TOKEN

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Strava sync failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Strava sync completed successfully." -ForegroundColor Green
} else {
    Write-Host "Strava environment variables not set. Skipping Strava sync." -ForegroundColor Red
    Write-Host "Please set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REFRESH_TOKEN in .env file" -ForegroundColor Yellow
    exit 1
}

# Optional: Generate SVG visualizations
# Uncomment the following sections if you want to generate SVG files

# Generate Grid SVG
# Write-Host ""
# Write-Host "Generating Grid SVG..." -ForegroundColor Yellow
# python run_page/gen_svg.py --from-db --type grid --output assets/grid.svg

# Generate GitHub SVG
# Write-Host "Generating GitHub SVG..." -ForegroundColor Yellow
# python run_page/gen_svg.py --from-db --type github --output assets/github.svg

# Generate Circular SVG
# Write-Host "Generating Circular SVG..." -ForegroundColor Yellow
# python run_page/gen_svg.py --from-db --type circular --output assets/year.svg

# Build the project
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building running page..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green

# Commit and push changes
Write-Host ""
Write-Host "Committing and pushing changes..." -ForegroundColor Yellow

git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git add failed!" -ForegroundColor Red
    exit 1
}

$commitMessage = "sync and update data - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git commit failed (may be no changes to commit)." -ForegroundColor Gray
} else {
    Write-Host "Changes committed." -ForegroundColor Green

    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Git push failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Changes pushed to remote." -ForegroundColor Green
}

# Optional: Upload to COS (requires coscli)
# Uncomment if you have coscli configured
# Write-Host ""
# Write-Host "Uploading to COS..." -ForegroundColor Yellow
# coscli cp -r dist cos://hk//running
# if ($LASTEXITCODE -ne 0) {
#     Write-Host "COS upload failed!" -ForegroundColor Red
# } else {
#     Write-Host "Upload completed." -ForegroundColor Green
# }

# Send notification (optional)
# Uncomment if you have notify command
# notify 'running page 发布完成 ✅'

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Running page deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
