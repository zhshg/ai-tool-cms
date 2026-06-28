#!/usr/bin/env bash
# Verify latest backups exist — Commit 106
set -euo pipefail

PG_DIR="${1:-./backups/postgres}"
FAIL=0

if ls "$PG_DIR"/*.sql.gz 1>/dev/null 2>&1; then
  echo "[verify] postgres backups OK"
else
  echo "[verify] postgres backups MISSING"
  FAIL=1
fi

exit $FAIL
