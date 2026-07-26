# Release Candidate Sprint 2 Batch 4 - Search Experience

## Executive Summary

This batch upgrades the production search experience for AI Tool CMS. It adds public search discovery APIs for autocomplete, suggestions, synonyms, recent searches, and popular searches, while preserving the existing advanced filters, sorting, Meilisearch integration, Prisma fallback, and SSR search page.

The work does not redesign the database schema. It reuses existing search indexes, `SearchQueryLog`, `SearchClickLog`, Tool metadata, categories, tags, and the public `/search` page.

## User Experience Goals

- Help users start searches faster with autocomplete.
- Help users recover from vague queries through suggestions and synonyms.
- Show recent successful searches and popular searches.
- Preserve advanced filters for category, pricing, platform, language, tag, API, free, and open source.
- Preserve sorting by newest, popular, trending, A-Z, rating, and relevance.
- Keep the page resilient when search infrastructure is degraded.

## API Surface

### Search

`GET /v1/search`

Supports:

- `q` or `keyword`
- `category`
- `pricing`
- `platform`
- `language`
- `tag`
- `api`
- `free`
- `openSource`
- `sort`
- `page`
- `pageSize`
- `semantic`

### Autocomplete

`GET /v1/search/autocomplete?q={query}&limit=10`

Returns mixed suggestions from:

- Published tools
- Categories
- Tags
- Successful query logs

### Suggestions

`GET /v1/search/suggestions?q={query}&limit=10`

Returns:

- Autocomplete results
- Synonyms
- Popular searches
- Recent searches

### Popular Searches

`GET /v1/search/popular?limit=10`

Returns top successful search queries from the last 30 days based on `SearchQueryLog`.

### Recent Searches

`GET /v1/search/recent?limit=10`

Returns recent unique successful queries from `SearchQueryLog`.

## Synonyms

Synonym expansion already exists in `packages/search/src/synonyms.ts` and is used by the search engine. This batch exposes synonym-driven suggestions through the new suggestions endpoint and public search page.

Current synonym groups include:

- AI PPT, presentation, slides, deck
- Chatbot, chat bot, conversational AI, assistant
- Code assistant, Copilot, coding AI, IDE assistant
- Image generator, text to image, AI art
- Video generator, text to video, AI video
- Writing, copywriting, content writer
- Search, research, Perplexity, answer engine

## Filters

Supported filters:

| Filter | Query Parameter | Source |
| --- | --- | --- |
| Category | `category` | Category slug |
| Pricing | `pricing` | Tool pricing model |
| Platform | `platform` | Tool metadata platforms |
| Language | `language` | Tool metadata languages |
| Tag | `tag` | Tag slug |
| API | `api=true` | Tool metadata API/integration signals |
| Free | `free=true` | FREE or FREEMIUM pricing |
| Open Source | `openSource=true` | Tool metadata and open-source tags |

## Sorting

Supported sorting:

| Sort | Query Parameter | Behavior |
| --- | --- | --- |
| Relevance | `sort=relevance` | Keyword/semantic ranking |
| Newest | `sort=newest` | Published or updated date descending |
| Popular | `sort=popular` | Popularity score descending |
| Trending | `sort=trending` | Trending score descending |
| A-Z | `sort=a-z` | Name ascending |
| Rating | `sort=rating` | Review score descending |

## Frontend Integration

The public `/[locale]/search` page now uses:

- Suggestions from autocomplete, synonyms, popular searches, and recent searches.
- `datalist` search input for native autocomplete support.
- Suggestion chips for synonyms, popular searches, and recent searches.
- Existing advanced filters for category, tag, pricing, platform, language, API, free, and open source.
- Existing result cards and pagination.

## Resilience

Search remains resilient in two ways:

1. API-level fallback: the search package falls back to Prisma when Meilisearch is unavailable.
2. Web-level fallback: the search page returns a degraded empty result state instead of crashing when the API is unavailable.

## Search Analytics

Search analytics continue to use:

- `SearchQueryLog`
- `SearchClickLog`

The new popular and recent endpoints reuse these logs without requiring schema changes.

## Acceptance Status

| Requirement | Status | Evidence |
| --- | --- | --- |
| Autocomplete | PASS | `GET /v1/search/autocomplete` added. |
| Suggestions | PASS | `GET /v1/search/suggestions` added and used by public page. |
| Synonyms | PASS | Existing synonym expansion exposed in suggestions. |
| Recent Search | PASS | `GET /v1/search/recent` added and used by public page. |
| Popular Search | PASS | `GET /v1/search/popular` added and used by public page. |
| Category filter | PASS | Existing `category` filter preserved. |
| Pricing filter | PASS | Existing `pricing` filter preserved. |
| Platform filter | PASS | Existing `platform` filter preserved. |
| Language filter | PASS | Existing `language` filter preserved. |
| Tag filter | PASS | Existing `tag` filter preserved. |
| API filter | PASS | Existing `api` filter preserved. |
| Open Source filter | PASS | Existing `openSource` filter preserved. |
| Newest sorting | PASS | Existing `newest` sort preserved. |
| Popular sorting | PASS | Existing `popular` sort preserved. |
| Trending sorting | PASS | Existing `trending` sort preserved. |
| A-Z sorting | PASS | Existing `a-z` sort preserved. |

## Files Changed

- `apps/api/src/search/dto/search-query.dto.ts`
- `apps/api/src/search/search.controller.ts`
- `apps/api/src/search/search.service.ts`
- `apps/web/src/app/[locale]/search/page.tsx`
- `apps/web/src/lib/catalog.ts`
- `docs/14-production/SearchExperience.md`

## Verification

- `pnpm typecheck` passes.
- `pnpm lint` passes with existing non-blocking Blog CMS `<img>` warnings only.

## Future Hardening

1. Add client-side debounced autocomplete dropdown for richer keyboard navigation.
2. Add click tracking events from search result cards to `SearchClickLog`.
3. Add typo-tolerant synonym management in Admin.
4. Add zero-result query review workflow.
5. Add per-locale synonyms and localized suggestion dictionaries.
6. Add search A/B tests for ranking rules and popular/trending blend weights.
