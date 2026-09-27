#!/bin/bash
# AuraTrace — automated restore script
# Usage: ./scripts/restore.sh <timestamp>
set -e

TIMESTAMP=$1
if [ -z "$TIMESTAMP" ]; then
    echo "Usage: $0 <timestamp>"
    echo "Available backups:"
    ls -1 backups/ | grep postgres | sed 's/postgres_//;s/.sql.gz//'
    exit 1
fi

echo "⚠️  Restoring from $TIMESTAMP — this will replace all current data!"
read -p "Continue? (yes/no): " confirm
[ "$confirm" != "yes" ] && exit 1

echo "🛑 Stopping services..."
docker compose stop ingestion-service ml-anomaly-service rag-service repair-worker

echo "🗑️  Re-creating database..."
docker exec trace-postgres psql -U postgres -c "DROP DATABASE IF EXISTS auratrace_db;"
docker exec trace-postgres psql -U postgres -c "CREATE DATABASE auratrace_db OWNER postgres;"

echo "📥 Restoring PostgreSQL..."
gunzip -c "backups/postgres_$TIMESTAMP.sql.gz" | docker exec -i trace-postgres psql -U postgres auratrace_db

echo "📥 Restoring Redis..."
if [ -f "backups/redis_$TIMESTAMP.rdb" ]; then
    docker cp "backups/redis_$TIMESTAMP.rdb" trace-redis:/data/dump.rdb
    docker restart trace-redis
fi

echo "🚀 Starting services..."
docker compose start ingestion-service ml-anomaly-service rag-service repair-worker

echo "✅ Restore complete"
