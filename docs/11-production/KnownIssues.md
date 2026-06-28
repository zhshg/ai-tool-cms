# Known Issues

**Sprint 11**

| ID | Severity | Component | Issue | Workaround |
|----|----------|-----------|-------|------------|
| KI-01 | Low | Public API | Path is `/v1/api/v1/*` | Gateway rewrite to `/api/v1/*` |
| KI-02 | Low | Docker Compose | Infra only — no app containers | Use `pnpm dev:stack` or K8s |
| KI-03 | Info | k6 | Load tests require running API + optional API key | Set `API_URL`, `API_KEY` |
| KI-04 | Info | Playwright E2E | Requires web + api running | `pnpm dev:stack` before e2e |

## Monitoring

Track new issues in GitHub Issues with label `known-issue`.
