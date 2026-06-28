# Security Checklist

**Sprint 11 — Commit 103**

## Application

- [x] Helmet-equivalent security headers
- [x] CORS restricted in production (`CORS_ORIGINS`)
- [x] Input validation (`ValidationPipe` whitelist)
- [x] RBAC permissions on admin routes
- [x] API key scopes + rate limit
- [x] Webhook HMAC signing
- [x] JWT secrets from env (not hardcoded)

## Infrastructure

- [x] `pnpm audit` in CI
- [x] Trivy filesystem scan in CI
- [ ] Gitleaks (add org secret scanning)
- [ ] Dependabot (see `.github/dependabot.yml`)

## KPI Target

| Metric | Target | Sprint 11 |
|--------|--------|-----------|
| Critical vulnerabilities | 0 | ✅ |
| High vulnerabilities | 0 | Run `pnpm audit` |
| Secrets in repo | 0 | ✅ |
