#!/bin/bash
# AuraTrace — full automated backup script
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo "🔒 Backing up PostgreSQL..."
docker exec trace-postgres pg_dump -U postgres auratrace_db | gzip > "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

echo "🔒 Backing up Redis..."
docker exec trace-redis redis-cli SAVE
docker cp trace-redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

echo "🔒 Backing up .env..."
cp .env "$BACKUP_DIR/env_$TIMESTAMP.backup"

echo "🧹 Cleaning old backups (keeping 30 days)..."
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "✅ Backup complete: $BACKUP_DIR/*_$TIMESTAMP.*"
ls -lh "$BACKUP_DIR"/*_$TIMESTAMP.*
