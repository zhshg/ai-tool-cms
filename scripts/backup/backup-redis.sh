#!/usr/bin/env bash
# Redis RDB snapshot copy — Commit 106
set -euo pipefail

OUT_DIR="${1:-./backups/redis}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

: "${REDIS_URL:?REDIS_URL is required}"

echo "[backup] redis BGSAVE"
redis-cli -u "$REDIS_URL" BGSAVE
sleep 2
redis-cli -u "$REDIS_URL" --rdb "$OUT_DIR/dump-${STAMP}.rdb"
echo "[backup] redis done"
