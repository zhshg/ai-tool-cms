# Migration Status

**Version:** 1.0.0-rc.1 → Production Ready

## Database Migrations

| Migration | Sprint | Status |
|-----------|--------|--------|
| `20260627220000_open_ecosystem_v1` | 10 | ✅ Applied |
| `20260627210000_autonomous_platform_v1` | 9 | ✅ Applied |

## Deploy Steps

```bash
pnpm db:migrate:deploy
pnpm db:seed   # optional for fresh env
```

## Rollback

1. Restore Postgres from `scripts/backup/backup-postgres.sh`
2. Redeploy previous Docker image tag
3. Run `pnpm db:migrate:deploy` only if down-migration exists

## Data Compatibility

- No breaking schema changes in Sprint 11
- New env vars: `CORS_ORIGINS`, `CACHE_DEFAULT_TTL_SECONDS`, `TRUST_PROXY`
