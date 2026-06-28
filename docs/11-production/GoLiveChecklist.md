# Go-Live Checklist

**Sprint 11 — Commit 110**

## Code Quality

- [x] ESLint = 0 Error
- [x] TypeScript = 0 Error
- [x] Dead code cleanup documented
- [x] Circular dependency = 0 (turbo build)

## Performance

- [x] Compression enabled (API)
- [x] Redis cache-aside (Public API)
- [x] Next.js image optimization
- [ ] Lighthouse ≥95 (run against staging)
- [ ] P95 API <500ms (k6 on staging)
- [ ] TTFB <300ms (CDN + ISR)

## Security

- [x] Security headers
- [x] CORS production config
- [x] CI security scan (audit + Trivy)
- [ ] Secrets scan = 0 (Gitleaks in org)

## Reliability

- [x] Backup scripts (`scripts/backup/`)
- [ ] Restore drill completed
- [x] Queue retry (BullMQ)
- [x] Readiness probe `/v1/health/ready`

## Testing

- [x] Unit tests (Vitest)
- [x] Integration tests
- [x] E2E smoke (Playwright)
- [ ] Coverage ≥90% unit (expand in Sprint 12)

## Deployment

- [x] CI/CD pipeline (`.github/workflows/`)
- [ ] Rollback tested on staging
- [x] Health checks

## Monitoring

- [x] Prometheus metrics endpoint
- [x] OpenTelemetry hooks
- [x] Sentry optional init
- [ ] Grafana dashboards (infra)

## Decision

| Environment | Status |
|-------------|--------|
| Staging | ✅ Go |
| Production GA | ⏳ Sprint 12 after KPI verification |
