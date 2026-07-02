# Product Sprint 1: Homepage Redesign

## Goal

Redesign the public homepage from platform marketing into an AI Tool Directory homepage focused on discovery.

## Scope

- Replaced CMS-first homepage messaging with directory-first messaging.
- Kept admin features unchanged.
- Kept backend business logic unchanged.
- Reused existing Prisma-backed catalog helpers and seeded tool/category data.

## Homepage Sections

- Hero with a large search box wired to `/{locale}/search`
- Popular categories
- Featured tools
- Trending tools
- Latest tools
- Free AI tools
- Blog and guides
- Newsletter-style CTA with working RSS and blog links

## Implementation Notes

- Homepage data is now assembled in [`apps/web/src/lib/catalog.ts`](F:/project/ai-tool-cms/apps/web/src/lib/catalog.ts).
- Homepage UI is rendered from [`apps/web/src/app/[locale]/page.tsx`](F:/project/ai-tool-cms/apps/web/src/app/[locale]/page.tsx).
- Shared public navigation and footer were retargeted to directory discovery flows:
  - [`apps/web/src/components/marketing/site-header.tsx`](F:/project/ai-tool-cms/apps/web/src/components/marketing/site-header.tsx)
  - [`apps/web/src/components/marketing/site-footer.tsx`](F:/project/ai-tool-cms/apps/web/src/components/marketing/site-footer.tsx)
- SEO metadata and homepage JSON-LD were updated for production use.

## Data Strategy

- `categories`: Prisma category query with published tool counts, sorted by popularity.
- `featuredTools`: latest published tools, first four entries.
- `trendingTools`: latest published tools filtered toward non-free / multimodal entries.
- `latestTools`: newest published tools.
- `freeTools`: free tools first, then freemium tools as fallback.
- `stats`: published tool count, category count, and free-to-try count.

## Verification

- `pnpm --filter @ai-tool-cms/web lint`: PASS
- `pnpm --filter @ai-tool-cms/web typecheck`: PASS

Planned final verification for this sprint:

- `pnpm lint`
- `pnpm typecheck`
- `docker compose --env-file .env.production -f docker-compose.prod.yml build web`
- `http://localhost`

## Outcome

The homepage now behaves like an AI tools discovery surface instead of presenting AI Tool CMS as the primary product.
