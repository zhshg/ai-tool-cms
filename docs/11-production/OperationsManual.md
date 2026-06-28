# Operations Manual

## Services

| Service | Port | Health |
|---------|------|--------|
| Web | 3000 | Homepage |
| Admin | 3001 | Login |
| API | 4000 | `/v1/health/ready` |
| Worker | — | Queue processing |
| Postgres | 5432 | readiness probe |
| Redis | 6379 | readiness probe |

## Daily Ops

- Check Sentry / Grafana dashboards
- Verify backup job (`scripts/backup/verify-backup.sh`)
- Review failed webhook deliveries in Admin

## Weekly

- `pnpm audit`
- Review `TechnicalDebt.md`
- k6 load test on staging

## On-call

See `Runbook.md` and `docs/security/IncidentResponse.md`
