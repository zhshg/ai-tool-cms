#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/ai-tool-cms-release-seo-20260718-163220}"
API_CONTAINER="${API_CONTAINER:-ai-tool-cms-api-1}"
LIMIT="${BLOG_DAILY_LIMIT:-2}"
PUBLISH_FLAG=""
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:7b}"
CLEANUP_DAYS="${BLOG_CLEANUP_DAYS:-14}"

if [ "${BLOG_AUTO_PUBLISH:-true}" = "true" ]; then
  PUBLISH_FLAG="--publish"
fi

cd "$APP_DIR"

START_DATE="$(date -u -d "-${CLEANUP_DAYS} days" +%F)"

echo "[daily-blog] app_dir=$APP_DIR api_container=$API_CONTAINER limit=$LIMIT publish=${BLOG_AUTO_PUBLISH:-true} cleanup_days=$CLEANUP_DAYS start_date=$START_DATE"

docker exec "$API_CONTAINER" mkdir -p /app/scripts/blog
docker exec "$API_CONTAINER" mkdir -p /app/scripts/ops
docker cp "$APP_DIR/scripts/blog/generate-daily-blogs.mjs" "$API_CONTAINER:/app/scripts/blog/generate-daily-blogs.mjs"
docker cp "$APP_DIR/scripts/ops/backfill-blog-internal-links.js" "$API_CONTAINER:/app/scripts/ops/backfill-blog-internal-links.js"
docker cp "$APP_DIR/scripts/ops/verify-blog-link-format.js" "$API_CONTAINER:/app/scripts/ops/verify-blog-link-format.js"
echo "[daily-blog] step=generate"
docker exec \
  -e "OLLAMA_BASE_URL=$OLLAMA_BASE_URL" \
  -e "OLLAMA_MODEL=$OLLAMA_MODEL" \
  -e "BLOG_USE_OLLAMA=${BLOG_USE_OLLAMA:-true}" \
  -e "BLOG_REQUIRE_OLLAMA=${BLOG_REQUIRE_OLLAMA:-false}" \
  -w /app \
  "$API_CONTAINER" \
  node scripts/blog/generate-daily-blogs.mjs --limit "$LIMIT" $PUBLISH_FLAG

echo "[daily-blog] step=cleanup"
docker exec \
  -w /app \
  "$API_CONTAINER" \
  node scripts/ops/backfill-blog-internal-links.js --start-date "$START_DATE" --limit 200

echo "[daily-blog] step=verify"
docker exec \
  -w /app \
  "$API_CONTAINER" \
  node scripts/ops/verify-blog-link-format.js

echo "[daily-blog] completed"
