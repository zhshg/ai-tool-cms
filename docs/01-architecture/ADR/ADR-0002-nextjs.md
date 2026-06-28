# ADR-0002: Next.js for Web and Admin

> **Status:** Accepted  
> **Date:** 2026  
> **Deciders:** Project Architecture Team

---

## Context

The platform requires two browser-facing applications:

1. **Public Web** — SEO-critical, SSR/SSG, millions of potential pages
2. **Admin CMS** — Authenticated dashboard, fast iteration on forms and tables

Alternatives: Remix, Astro (web only), separate SPA (Vite + React) with suboptimal SEO.

---

## Decision

Use **Next.js 15** with **App Router** for both `apps/web` and `apps/admin`.

| Requirement | Next.js capability |
|---|---|
| SEO metadata | `generateMetadata`, `sitemap.ts`, `robots.ts` |
| Performance | SSR, SSG, ISR |
| Shared UI | React 19 + shared `@ai-tool-cms/ui` |
| API integration | Server Components fetch API at SSR time |

Admin and Web remain **separate deployables** for security network segmentation.

---

## Consequences

### Positive

- Unified React skill set across public and admin teams
- Built-in routing and metadata APIs reduce custom SEO plumbing
- Standalone output for Docker deployment

### Negative

- Two Next.js apps increase build CI time (mitigated by Turborepo cache)
- Server Components learning curve

---

## Compliance

- Public pages must use SSR or SSG for indexable content
- SEO metadata must use `@ai-tool-cms/seo` — not ad-hoc strings in pages
- Admin must not expose server-only secrets to client bundles

---

## Related

- [Sequence/SEO.md](../Sequence/SEO.md)
- [ADR-0003-nest.md](./ADR-0003-nest.md)
