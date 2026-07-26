# Release Candidate Sprint 3 Batch 5 - Security Proof

Date: 2026-07-04
Project: AI Tool CMS
Phase: Release Candidate Sprint 3 - Batch 5
Scope: Production Security Verification
Verified HEAD: `d85935e6 perf: production performance proof`

## Executive Summary

This batch completed a release-candidate security proof across dependency audit, runtime security controls, secrets posture, Docker configuration, CORS, headers, auth, RBAC, rate limiting, DTO validation, and Swagger exposure.

Final result: **WARN**.

The Critical vulnerability gate passed: `pnpm audit --audit-level critical` reported **0 Critical** vulnerabilities, so there were no Critical issues to fix in this batch.

However, the release candidate still has important non-Critical security risks:

- `pnpm audit --json` reports **3 High**, **11 Moderate**, and **1 Low** dependency advisories.
- Trivy is not installed locally, and the safer Trivy container fallback was blocked because mounting the Docker daemon socket into a third-party scanner container is too privileged.
- Swagger is publicly reachable at `http://localhost/api/docs`.
- Current local `.env.production` has non-placeholder but short infrastructure secrets for PostgreSQL, Redis, and Meilisearch.

## Scan Commands and Evidence

| Check | Command / Evidence | Result |
| --- | --- | --- |
| Critical dependency gate | `pnpm audit --audit-level critical` | PASS, 0 Critical |
| Full dependency audit | `pnpm audit --json` | WARN, 15 total advisories |
| Trivy availability | `Get-Command trivy` | FAIL, Trivy not installed |
| Trivy container fallback | `docker run aquasec/trivy` | NOT RUN, rejected due Docker socket risk |
| Security headers | `GET http://localhost/v1/health` | PASS |
| Auth protection | `GET http://localhost/v1/tools` without token | PASS, 401 |
| CORS untrusted origin | `Origin: https://evil.example` | PASS, no reflected ACAO |
| CORS allowed origin | `Origin: http://localhost` | PASS, ACAO `http://localhost` |
| Swagger public path | `GET http://localhost/api/docs` | WARN, 200 |
| Swagger under `/v1` | `GET http://localhost/v1/api/docs` | PASS, 404 |
| Docker images listed | `docker images` | PASS |
| Tracked secret pattern scan | `git grep` for common secret patterns | PASS, no obvious tracked secret hit |
| Local `.env.production` posture | redacted key presence/length check | WARN, infra secrets should be stronger |

## Dependency Audit Summary

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 3 |
| Moderate | 11 |
| Low | 1 |
| Total | 15 |

### High Advisories

| Package | Current | Advisory | Path | Recommended Fix |
| --- | --- | --- | --- | --- |
| `nodemailer` | 6.10.1 | `GHSA-rcmh-qjqh-p98v`, DoS in addressparser recursive calls | `packages__email>nodemailer` | Upgrade to a patched version after compatibility testing. |
| `multer` | 2.1.1 | `GHSA-72gw-mp4g-v24j`, DoS via deeply nested field names | Nest platform express transitive dependency | Upgrade `@nestjs/platform-express` / `multer` path when patched version is available and compatible. Add upload field-depth limits where possible. |
| `nodemailer` | 6.10.1 | `GHSA-p6gq-j5cr-w38f`, raw option bypasses file/url access controls | `packages__email>nodemailer` | Upgrade to patched Nodemailer and keep file/url access disabled where supported. |

### Moderate / Low Themes

| Package | Severity | Notes |
| --- | --- | --- |
| `nodemailer` | Moderate / Low | Multiple SMTP/header/file/url handling advisories. |
| `postcss` | Moderate | XSS in CSS stringify output; transitive through Next/PostCSS paths. |
| `next-intl` | Moderate | Open redirect and prototype pollution advisories in older `next-intl`. |
| `@opentelemetry/core` | Moderate | Unbounded memory allocation via W3C baggage propagation. |
| `multer` | Moderate | Cleanup issue for aborted uploads. |
| `js-yaml` | Moderate | Quadratic-complexity DoS via aliases. |

## Runtime Security Controls

| Area | Status | Evidence |
| --- | --- | --- |
| JWT | PASS with note | `JwtStrategy` extracts Bearer token, verifies expiration, enforces access-token type, and loads active user through RBAC service. Production fallback to `development-secret` is mitigated by config validation, but should remain monitored. |
| RBAC | PASS | Global `PermissionsGuard` enforces `@RequirePermission(...)`; unauthorized `/v1/tools` returned 401 without token. |
| Rate limit | PASS | Global `ThrottlerGuard` configured at 300 req/min; login has stricter 10 req/min and refresh 20 req/min. Public search and public API routes also have route throttles. |
| DTO validation | PASS | Global `ValidationPipe` enables `whitelist`, `transform`, and `forbidNonWhitelisted`. |
| Headers | PASS | Runtime response includes `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS. |
| CORS | PASS | Trusted origin is reflected; untrusted origin is not reflected. |
| Secrets | WARN | No obvious tracked secret hit; local production infra passwords/master key should be lengthened. |
| Docker images | PASS with limitation | Images are present and Dockerfiles run non-root users; Trivy image vulnerability scan was not completed. |
| Swagger | WARN | Public Swagger UI is reachable at `/api/docs`; disable or protect in production. |

## Source Evidence

| Control | File / Line |
| --- | --- |
| Global CORS | `apps/api/src/main.ts:18` |
| Security headers | `apps/api/src/main.ts:26`, `apps/api/src/common/security.ts:6` |
| Global API prefix | `apps/api/src/main.ts:28` |
| DTO validation | `apps/api/src/main.ts:37` |
| Swagger setup | `apps/api/src/main.ts:53`, `apps/api/src/main.ts:54` |
| Global rate limit | `apps/api/src/app.module.ts:48` |
| Global guards | `apps/api/src/app.module.ts:83`, `apps/api/src/app.module.ts:84`, `apps/api/src/app.module.ts:85` |
| JWT guard | `apps/api/src/common/guards/jwt-auth.guard.ts:7` |
| Permissions guard | `apps/api/src/common/guards/permissions.guard.ts:7` |
| JWT strategy | `apps/api/src/auth/strategies/jwt.strategy.ts:10` |
| Weak/placeholder production config validation | `packages/config/src/parse.ts:169`, `packages/config/src/parse.ts:179`, `packages/config/src/parse.ts:190` |
| Node Docker non-root user | `docker/Dockerfile.node:22`, `docker/Dockerfile.node:35` |
| Next Docker non-root user | `docker/Dockerfile.next:33`, `docker/Dockerfile.next:45` |

## Docker Image Inventory

| Image | Size |
| --- | ---: |
| `ghcr.io/zhshg/ai-tool-cms-web:1.0.0` | 336 MB |
| `ghcr.io/zhshg/ai-tool-cms-api:1.0.0` | 1.55 GB |
| `ghcr.io/zhshg/ai-tool-cms-worker:1.0.0` | 1.53 GB |
| `ghcr.io/zhshg/ai-tool-cms-admin:1.0.0` | 309 MB |
| `ghcr.io/zhshg/ai-tool-cms-scheduler:1.0.0` | 1.53 GB |
| `postgres:16-alpine` | 420 MB |
| `redis:7-alpine` | 57.8 MB |
| `nginx:1.27-alpine` | 74.5 MB |
| `minio/minio:RELEASE.2024-12-18T13-15-44Z` | 244 MB |
| `getmeili/meilisearch:v1.11` | 233 MB |

## Findings

### Critical

| Finding | Status | Action |
| --- | --- | --- |
| Critical dependency vulnerabilities | PASS | None found by `pnpm audit --audit-level critical`. |
| Critical runtime control failure | PASS | None found in this proof. |

### High

| Finding | Reason | Affected Area | Recommended Fix |
| --- | --- | --- | --- |
| High dependency advisories remain | `pnpm audit --json` reports 3 High advisories in `nodemailer` and `multer` paths. | `packages/email`, Nest upload stack | Upgrade dependencies with compatibility testing; add upload limits and sanitize email transport options. |
| Trivy image scan incomplete | Local Trivy is unavailable; Docker socket mount into scanner container was rejected as unsafe. | Docker image vulnerability proof | Install Trivy as a trusted host binary or run it in CI with least-privilege registry/image scanning. |
| Short infrastructure secrets in local `.env.production` | PostgreSQL, Redis, and Meilisearch values are present and non-placeholder but only 16 chars. | Production secret posture | Rotate to 32+ byte random values before external launch. |

### Medium

| Finding | Reason | Affected Area | Recommended Fix |
| --- | --- | --- | --- |
| Public Swagger UI | `http://localhost/api/docs` returns 200. | API documentation exposure | Disable Swagger in production or protect it behind admin auth/IP allowlist. |
| Missing Content-Security-Policy header | Runtime headers include core hardening headers but no CSP. | API/web security headers | Add CSP at nginx/web layer after validating frontend resource needs. |
| bfcache disabled by `Cache-Control: no-store` | Found in previous Lighthouse diagnostics. | Public page caching posture | Tune cache headers for public pages while preserving admin/API no-store. |

## Fixes Applied

No code changes were required for Critical issues because no Critical vulnerabilities were found.

## Required Follow-Up

1. Install trusted Trivy binary in CI or release host and scan all production images.
2. Upgrade or mitigate High advisories for `nodemailer` and `multer` paths.
3. Rotate local/production infrastructure secrets to stronger random values.
4. Disable or protect Swagger in production.
5. Add a production CSP policy after validating frontend assets and third-party integrations.

## Final Decision

| Gate | Result |
| --- | --- |
| Critical vulnerabilities fixed | PASS, none found |
| Dependency audit completed | PASS with High/Moderate risks |
| Trivy completed | FAIL / NOT VERIFIED |
| Runtime controls verified | PASS |
| Secrets verified | WARN |
| Docker posture verified | PASS with Trivy limitation |
| Swagger verified | WARN |

**Batch 5 Result: WARN**

The release candidate passes the Critical security gate, but the security proof is not fully complete until Trivy image scanning is executed and the remaining High dependency and production configuration risks are resolved.