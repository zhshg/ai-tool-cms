# Runbook

## API Down

```bash
curl -f $API_URL/v1/health/ready
kubectl logs -l app=ai-tool-cms-api --tail=100
kubectl rollout restart deployment/ai-tool-cms-api
```

## Worker Queue Backlog

```bash
# Redis CLI
redis-cli -u $REDIS_URL LLEN bull:ai-summary:wait
# Scale workers
kubectl scale deployment/ai-tool-cms-worker --replicas=3
```

## Database Slow

```bash
# Check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Review slow queries in logs / OTEL
```

## Restore from Backup

```bash
./scripts/backup/restore-postgres.sh backups/postgres/latest.sql.gz
```
