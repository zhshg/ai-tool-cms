#!/usr/bin/env bash
# 30 分钟部署验证脚本
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> AI Tool CMS Starter Verification"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "==> Starting infrastructure..."
pnpm docker:up

echo "==> Database migrate..."
pnpm db:migrate:deploy

echo "==> Seed (optional)..."
pnpm db:seed || true

echo "==> Build API..."
pnpm --filter @ai-tool-cms/api build

echo "==> Health check (API must be running separately for full check)"
echo "Run: pnpm dev:stack"
echo "Then: curl -f http://localhost:4000/v1/health/ready"

echo "==> Starter verification setup complete."
