# Operations Manual

## Services

| Service | Port | Health |
|---------|------|--------|
| Web | 3000 | Homepage |
| Admin | 3001 | Login |
| API | 4000 | `/v1/health/ready` |
| Worker | N/A | Queue processing |
| Postgres | 5432 | readiness probe |
| Redis | 6379 | readiness probe |

## Daily Ops

- 检查 Sentry / Grafana 仪表盘。
- 校验备份任务 `scripts/backup/verify-backup.sh`。
- 在 Admin 中查看失败的 webhook 投递。
- 如果执行过 `tools:auto-update` 或 `crawler:run`，同步检查 `/opt/ai-tool-cms/storage/auto-update/` 下的最新产物。

产物目录：

- Snapshots: `/opt/ai-tool-cms/storage/auto-update/candidates/`
- Reports: `/opt/ai-tool-cms/storage/auto-update/reports/`
- Logs: `/opt/ai-tool-cms/storage/auto-update/logs/`

注意：

- New production reports are no longer written to `/opt/ai-tool-cms/docs/operations/reports`.
- New production logs are no longer written to `/opt/ai-tool-cms/logs/auto-update`.
- Repository files under `docs/operations/reports/` are historical examples only.

## Weekly

- `pnpm audit`
- Review `TechnicalDebt.md`
- k6 load test on staging

## On-call

参见 [Runbook.md](./Runbook.md) 与 `docs/security/IncidentResponse.md`。
