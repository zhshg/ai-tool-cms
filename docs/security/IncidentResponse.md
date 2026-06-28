# Incident Response

## Severity Levels

| Level | Example | Response Time |
|-------|---------|---------------|
| SEV-1 | Data breach, full outage | 15 min |
| SEV-2 | API degraded, queue stuck | 1 hour |
| SEV-3 | Non-critical bug | Next business day |

## Playbook

1. **Detect** — Sentry alert / health check failure / user report
2. **Triage** — Check `/v1/health/ready`, Grafana, logs
3. **Mitigate** — Rollback deploy, scale workers, disable feature flag
4. **Communicate** — Status page update
5. **Post-mortem** — Document in `docs/11-production/`

## Contacts

Configure on-call rotation in your org (PagerDuty / Opsgenie).

## Rollback

```bash
# Redeploy previous image
kubectl rollout undo deployment/ai-tool-cms-api
# Or Docker
docker compose up -d --no-deps api:previous-tag
```
