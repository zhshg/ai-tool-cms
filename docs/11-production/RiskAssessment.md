# Risk Assessment

**Sprint 11 — Production Readiness**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DB outage | Low | Critical | Backup every 15min; readiness probe |
| Redis loss | Medium | High | Cache-aside degrades gracefully |
| API overload | Medium | High | Rate limit + k6 load tests + compression |
| Secret leak | Low | Critical | Gitleaks/Trivy in CI; no secrets in repo |
| Queue backlog | Medium | Medium | BullMQ retries; worker concurrency tuned |
| Deploy failure | Low | High | Blue/green + health check gate |

## Residual Risk

Acceptable for **staging** and **RC** environments. Full production GA requires Sprint 12 sign-off per `ProductionAcceptance.md`.
