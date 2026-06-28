# Changelog

All notable changes to AI Tool CMS are documented in this file.

## [1.0.0] — 2026-06-27

Sprint 12: Launch & Growth — General Availability (Commits 111–120)

### Added

- **Release Review** — `docs/12-release/*` (ReleaseReview, GoLiveReport, KnownLimitations, RiskLog)
- **Developer Handbook** — `docs/GettingStarted.md`, `Installation.md`, `Architecture.md`, `API.md`, `PluginGuide.md`, `WorkflowGuide.md`, `Deployment.md`, `Contributing.md`, `FAQ.md`
- **Examples** — `examples/starter`, `docker`, `plugin`, `api`
- **Operations Manual** — `docs/operations/*` (Runbook, Backup, Restore, Incident, Monitoring, Upgrade, Rollback)
- **Official Website** — Full landing page (Hero → Features → Architecture → Demo → CTA), Pricing, Docs, Blog, Changelog, Showcase
- **SEO Dashboard** — Admin wired to `/v1/seo/dashboard` and Search Console APIs
- **Community** — `.github/ISSUE_TEMPLATE`, `PULL_REQUEST_TEMPLATE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SUPPORT.md`
- **Marketing Assets** — `media/logo`, `banner`, `screenshots`, `demo`
- **Roadmap** — `ROADMAP_v1.1.md`, `ROADMAP_v2.0.md`, `VISION_2027.md`
- **Release artifacts** — `VERSION`, `RELEASE.md`, `NOTICE`, Docker `ghcr.io/zhshg/ai-tool-cms:1.0.0`

### Changed

- Monorepo version → `1.0.0`
- README updated for GA
- `@ai-tool-cms/config/client` adds `NEXT_PUBLIC_API_URL`

## [1.0.0-prod.1] — 2026-06-27

Sprint 11: Production Readiness — Zero Downtime Release (Commits 101–110)

### Added

- **Production audit** — `scripts/audit/production-audit.mjs`, `docs/11-production/*`
- **Performance** — `@ai-tool-cms/cache` (Redis cache-aside), API compression, Public API response cache
- **Security** — Helmet-equivalent headers, CORS config, `docs/security/*`
- **Monitoring** — `@ai-tool-cms/monitoring` (Prometheus metrics, health probes `/live` `/ready` `/metrics`)
- **Testing** — `tests/e2e`, `tests/performance/k6`, Playwright smoke tests
- **Backup/DR** — `scripts/backup/*` (Postgres, Redis)
- **CI/CD** — `.github/workflows/ci.yml`, `deploy.yml`, Dependabot

### Changed

- Health controller: liveness + readiness probes with DB/Redis checks
- Next.js: compress, image optimization, package import optimization
- Worker uses `@ai-tool-cms/monitoring`

## [1.0.0-rc.1] — 2026-06-27

Sprint 10: AI Platform & Open Ecosystem (Commits 091–100)

### Added

- **Public REST API v1** (`/v1/api/v1/*`): tools, categories, tags, search, trending, compare, alternatives, pricing, latest
- **OpenAPI 3.1** documentation with API key security scheme
- **API Key authentication** with scopes, rate limiting, usage logging
- **Cursor pagination**, **ETag**, and **Cache-Control** on public endpoints
- **MCP Server** (`packages/mcp-server`): `search_tools`, `get_tool`, `compare_tools`, `list_categories`, `list_trending`, `get_pricing`, `latest_tools`
- **TypeScript SDK** (`@ai-tool-cms/sdk`): `ToolCMSClient` for developer integrations
- **Webhook Hub**: event catalog, delivery tracking, retry, test events
- **Webhook events**: `TOOL_ADDED`, `TOOL_UPDATED`, `TOOL_DELETED`, `CRAWLER_FINISHED`, `AI_GENERATED`, `SEO_UPDATED`
- **Plugin Framework** (`packages/plugins`): lifecycle hooks (`onToolCreated`, `beforePublish`, `afterPublish`, etc.)
- **Workflow Engine** (`packages/workflow`): configurable publish pipeline definitions
- **Feature Flags** (`packages/feature-flags`): rollout, locale, region, segment targeting
- **Observability** (`packages/observability`): OpenTelemetry + Sentry hooks
- **Release documentation**: `docs/RELEASE-v1.0.0-rc.1.md`

### Changed

- Monorepo version bumped to `1.0.0-rc.1`
- MCP handlers refactored to shared `@ai-tool-cms/public-api` data layer
- Database seed now bootstraps workflows, plugins, and feature flags

### Deferred

- GraphQL API (Commit 092) → Sprint 11
- Workflow drag-and-drop UI → future sprint

### Migration

```bash
pnpm db:migrate:deploy
pnpm db:seed
```

See [RELEASE-v1.0.0-rc.1.md](./docs/RELEASE-v1.0.0-rc.1.md) for full setup guide.
