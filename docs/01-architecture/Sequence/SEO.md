# Sequence: SEO

> **Document Type:** Interaction Sequence  
> **Version:** 2.0.0  
> **Status:** Draft

---

## 1. Page Render (SSR Metadata)

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as apps/web
    participant SEO as packages/seo
    participant API as apps/api

    B->>W: GET /tools/chatgpt
    W->>API: GET /v1/tools/chatgpt
    API-->>W: Tool DTO
    W->>SEO: buildToolMetadata(tool)
    W->>SEO: buildJsonLd(tool, faqs)
    SEO-->>W: meta + SoftwareApplication schema
    W-->>B: HTML head + body + JSON-LD script
```

---

## 2. Publish → Sitemap Update

```mermaid
sequenceDiagram
    participant API as apps/api
    participant Q as BullMQ
    participant WRK as apps/worker
    participant SEO as packages/seo
    participant PG as PostgreSQL
    participant FS as Storage / public

    API->>Q: ToolPublished event
    Q->>WRK: sitemap job
    WRK->>PG: SELECT published tools, categories, articles
    WRK->>SEO: SitemapBuilder.addUrls()
    SEO-->>WRK: sitemap.xml bytes
    WRK->>FS: Write /sitemap.xml
```

---

## 3. robots.txt and Canonical

| Asset | Owner | Rule |
|---|---|---|
| `robots.txt` | `apps/web` route | Allow public; disallow `/admin` paths |
| Canonical URL | `packages/seo` | `APP_URL + path`; no duplicate params |
| hreflang | `packages/seo` | Per locale routes when i18n enabled |

---

## 4. Structured Data Types

| Page Type | JSON-LD Type |
|---|---|
| Tool detail | `SoftwareApplication` |
| FAQ block | `FAQPage` |
| Breadcrumbs | `BreadcrumbList` |
| Organization | `WebSite` on homepage |

**Policy:** JSON-LD must match visible content—no schema spam ([NonGoals.md](../../00-project/NonGoals.md)).

---

## 5. RSS Feed Generation

```mermaid
flowchart LR
    CRON[Scheduler] --> WRK[Worker]
    WRK --> PG[(Recent published tools)]
    WRK --> RSS[Build RSS XML]
    RSS --> WEB[Serve /feed/tools.xml]
```

---

## 6. SEO Validation Checklist (Publish Gate)

| Check | Block publish? |
|---|---|
| `metaTitle` present | Yes (configurable) |
| `metaDescription` length 50–160 | Warn |
| `slug` valid kebab-case | Yes |
| `canonical` resolvable | Yes |
| Logo alt text | Warn |

---

## Related Documents

- [EventFlow.md](../EventFlow.md)
- [DataFlow.md](../DataFlow.md)
- [ADR/ADR-0002-nextjs.md](../ADR/ADR-0002-nextjs.md)
