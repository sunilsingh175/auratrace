# scripts/quick_start.ps1
Write-Host "Starting AuraTrace Quick Setup..." -ForegroundColor Cyan

# 1. Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Check/Copy .env
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "[INFO] Created .env from .env.example. Please review API keys." -ForegroundColor Yellow
}

# 3. Launch Docker Compose containers
Write-Host "[INFO] Starting Docker containers..." -ForegroundColor Cyan
docker compose up -d

# 4. Wait for services to become healthy
Write-Host "[INFO] Waiting 15s for database and services initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 5. Run health and pipeline verification
Write-Host "[INFO] Running pipeline health checks..." -ForegroundColor Cyan
python scripts\verify_pipeline.py

Write-Host "`nAuraTrace is ready!" -ForegroundColor Green
Write-Host "Frontend Dashboard : http://localhost:3000" -ForegroundColor White
Write-Host "Ingestion API Docs : http://localhost:8000/docs" -ForegroundColor White
