#!/usr/bin/env bash
# Postgres backup — Commit 106
# Usage: ./scripts/backup/backup-postgres.sh [output_dir]
set -euo pipefail

OUT_DIR="${1:-./backups/postgres}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/ai-tool-cms-${STAMP}.sql.gz"

: "${DATABASE_URL:?DATABASE_URL is required}"

echo "[backup] postgres -> $FILE"
pg_dump "$DATABASE_URL" | gzip -9 > "$FILE"
echo "[backup] done size=$(du -h "$FILE" | cut -f1)"
