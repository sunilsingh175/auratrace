# scripts/quick_start.ps1
Write-Host "🚀 Starting AuraTrace Quick Setup..." -ForegroundColor Cyan

# 1. Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Check/Copy .env
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "⚠️ Created .env from .env.example. Please review API keys." -ForegroundColor Yellow
}

# 3. Launch Docker Compose containers
Write-Host "📦 Starting Docker containers..." -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Wait for services to become healthy
Write-Host "⏳ Waiting 25s for database & services initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

# 5. Run health and pipeline verification
Write-Host "🧪 Running pipeline health checks..." -ForegroundColor Cyan
python scripts\verify_pipeline.py

Write-Host "`n✨ AuraTrace is ready!" -ForegroundColor Green
Write-Host "🌐 Frontend Dashboard : http://localhost:3000" -ForegroundColor White
Write-Host "📡 Ingestion API Docs : http://localhost:8000/docs" -ForegroundColor White
