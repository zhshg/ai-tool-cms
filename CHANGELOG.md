# Changelog

All notable changes to AI Tool CMS are documented in this file.

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
