#!/usr/bin/env bash
# Postgres restore — Commit 106
# Usage: ./scripts/backup/restore-postgres.sh <backup.sql.gz>
set -euo pipefail

FILE="${1:?Usage: restore-postgres.sh <backup.sql.gz>}"
: "${DATABASE_URL:?DATABASE_URL is required}"

echo "[restore] $FILE -> database"
gunzip -c "$FILE" | psql "$DATABASE_URL"
echo "[restore] done"
