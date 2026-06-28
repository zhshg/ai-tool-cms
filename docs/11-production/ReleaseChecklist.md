# Release Checklist

1. Update `CHANGELOG.md`
2. Run full CI locally: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
3. Tag: `git tag v1.0.0`
4. Push tag → triggers `deploy.yml`
5. Run migrations on production
6. Verify health + smoke tests
7. Monitor 24h

## Rollback Criteria

- Error rate >1% for 5 min
- P95 latency >2s
- Database migration failure
