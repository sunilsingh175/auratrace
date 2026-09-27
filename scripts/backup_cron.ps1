# AuraTrace — Windows Automated Daily Backup
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$backupDir = Join-Path $projectRoot "backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "🔒 Backing up PostgreSQL..." -ForegroundColor Cyan
docker exec trace-postgres pg_dump -U postgres auratrace_db | Out-File -Encoding utf8 "$backupDir\postgres_$timestamp.sql"
Compress-Archive -Path "$backupDir\postgres_$timestamp.sql" -DestinationPath "$backupDir\postgres_$timestamp.sql.zip"
Remove-Item "$backupDir\postgres_$timestamp.sql"

Write-Host "🔒 Backing up Redis snapshot..." -ForegroundColor Cyan
docker exec trace-redis redis-cli SAVE | Out-Null
docker cp "trace-redis:/data/dump.rdb" "$backupDir\redis_$timestamp.rdb"

# Cleanup old backups older than 30 days
Get-ChildItem $backupDir -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Host "✅ Backup successfully created at $backupDir with timestamp: $timestamp" -ForegroundColor Green
