# Load Test Report

**Sprint 11 — Commit 108**

## Tool

[k6](https://k6.io/) — `tests/performance/k6/api-load.js`

## Run

```bash
# Start API first
pnpm dev:api

# Run load test
k6 run tests/performance/k6/api-load.js \
  -e API_URL=http://localhost:4000 \
  -e API_KEY=atcms_your_key
```

## Targets (KPI)

| Metric | Target | Notes |
|--------|--------|-------|
| RPS | 1000 | Scale horizontally for production |
| P95 latency | <500ms | Public API with cache |
| Error rate | <0.1% | Under normal load |

## Scenarios Covered

- `GET /v1/health/live`
- `GET /v1/api/v1/tools` (with API key)

## Capacity Planning

| Component | Recommendation |
|-----------|----------------|
| API | 2+ replicas behind LB |
| Worker | Concurrency 3–5 per queue |
| Postgres | Connection pool 20–50 |
| Redis | 1GB+ for cache + queues |

Record actual k6 results in CI artifacts after staging deploy.
