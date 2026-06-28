# @ai-tool-cms/seo

SEO Core Engine (Commits 041–050). **All pages must use this package** — no hand-rolled meta tags.

## Modules

| Path | Purpose |
|------|---------|
| `metadata/` | Title, description, canonical, OG, Twitter, hreflang, robots |
| `schema/` | JSON-LD: SoftwareApplication, FAQPage, BreadcrumbList, CollectionPage, ItemList |
| `sitemap/` | Split sitemap index + chunks, ping Google/Bing |
| `robots/` | robots.txt builder |
| `rss/` | RSS, Atom, JSON Feed, Public API feed |
| `internal-links/` | 20+ internal links per tool |
| `compare/` | Compare / alternatives / category landing metadata |
| `scoring/` | Site-wide SEO health score |
| `geo/` | SEO hints for GEO content (full engine: `@ai-tool-cms/geo`) |

## Usage

```ts
import { buildMetadata, buildToolPageJsonLd, buildSitemapIndex } from "@ai-tool-cms/seo";
```

## Web routes

- `/sitemap.xml` — index
- `/sitemaps/{tool|category|tag|prompt|compare|rss}.xml`
- `/feed/{rss|atom|json}.xml`
- `/robots.txt`

## API

- `GET /v1/seo/dashboard` — SEO health (050)
- `GET /v1/seo/search-console` — GSC + Bing (049)
- `POST /v1/seo/sync/compare-pages` — Compare engine (046)
- `POST /v1/seo/sync/internal-links` — Internal links (044)
