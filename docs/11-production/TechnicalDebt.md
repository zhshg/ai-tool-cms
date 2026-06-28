# Technical Debt Register

**Sprint 11 — Commit 101**

| ID | Area | Description | Priority | Target |
|----|------|-------------|----------|--------|
| TD-01 | Rate Limit | In-memory API key rate limit; migrate to Redis for multi-instance | High | Sprint 12 |
| TD-02 | GraphQL | Deferred from Sprint 10 | Low | Sprint 12+ |
| TD-03 | Workflow UI | No drag-and-drop workflow editor | Medium | Post-GA |
| TD-04 | i18n | Partial locale message files (fallback to `en.json`) | Low | Sprint 12 |
| TD-05 | SEO exports | Legacy sitemap export aliases in `@ai-tool-cms/seo` | Low | Sprint 12 |

## Resolved in Sprint 11

- [x] MCP ESM bundle (`dist/main.cjs`)
- [x] Docker CMD entrypoint (`dist/main.js`)
- [x] Web production build (i18n fallback, sitemap)

## Policy

No new TD items without an entry in this file.
