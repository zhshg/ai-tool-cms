# Product Sprint 4.6 - Advanced Search

## Summary

Implemented advanced public search for the AI Tool Directory. The work upgrades the existing `/search` experience and keeps the existing `/v1/search` API contract compatible while adding richer filters, sorting, suggestions, synonyms, and recent-search support.

## Files Modified

- `apps/web/src/app/[locale]/search/page.tsx`
- `apps/web/src/lib/catalog.ts`
- `apps/api/src/search/dto/search-query.dto.ts`
- `apps/api/src/search/search.service.ts`
- `packages/search/src/types.ts`
- `packages/search/src/filters.ts`
- `packages/search/src/search-service.ts`
- `packages/search/src/ranking.ts`
- `packages/search/src/client.ts`
- `packages/search/src/indexer.ts`
- `packages/search/src/bootstrap.ts`

## Filters

Added or completed support for:

- Category
- Tag
- Pricing
- Platform
- Language
- API support
- Free or freemium tools
- Open Source tools

The search index now stores:

- `platforms`
- `languages`
- `hasApi`
- `isFree`
- `isOpenSource`
- `popularityScore`
- `trendingScore`
- `reviewScore`

## Sorting

Added or completed support for:

- Relevance
- Newest
- Popular
- Trending
- A-Z
- Rating

Backward compatibility is preserved for the existing `popularity` sort alias while the UI uses `popular`.

## Search UX

The public search page now includes:

- Keyword search
- Autocomplete via `datalist`
- Suggestions from published tools
- Recent searches from existing `searchQueryLog`
- Advanced filter controls
- Boolean filter checkboxes
- Active filter chips
- Richer result badges for pricing, API, Open Source, and rating
- Pagination that preserves all filters

## API Notes

The public search endpoint remains `/v1/search`.

New query parameters:

- `platform`
- `language`
- `api`
- `free`
- `openSource`
- `sort=popular|trending|newest|a-z|rating|relevance`

Existing parameters remain supported:

- `q`
- `keyword`
- `category`
- `tag`
- `pricing`
- `page`
- `pageSize`
- `semantic`

## Search Engine Notes

Meilisearch index settings now include the new filterable and sortable fields.

The Prisma fallback search was upgraded so filters continue to work when Meilisearch is unavailable or not configured.

## Synonyms

Existing synonym expansion remains active through `expandQuerySynonyms`. This keeps intent-aware matching for common AI tool terms such as chatbot, code assistant, image generator, video generator, writing, and research/search queries.

## Recent Search

Recent searches are sourced from existing `SearchQueryLog` records with successful results. This avoids adding user-specific tracking or new database schema.

## Verification

Passed:

- `pnpm --filter @ai-tool-cms/search typecheck`
- `pnpm --filter @ai-tool-cms/search lint`
- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/api lint`
- `pnpm --filter @ai-tool-cms/web typecheck`
- `pnpm --filter @ai-tool-cms/web lint`
- `pnpm lint`
- `pnpm typecheck`

## Remaining Work

- Add browser-side local recent searches if product wants per-user history.
- Add a dedicated autocomplete JSON endpoint if the current datalist approach is not enough for high-traffic UX.
- Re-bootstrap Meilisearch in production so existing indexed documents receive `hasApi`, `isFree`, `isOpenSource`, and `trendingScore`.
- Add analytics for filter combinations after enough real traffic exists.
