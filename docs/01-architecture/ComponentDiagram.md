# Component Diagram (C4 Level 3)

> **Document Type:** C4 Component Diagram  
> **Version:** 2.0.0  
> **Status:** Draft

---

## API Container Components

Primary decomposition of `apps/api` (NestJS).

```mermaid
flowchart TB
    subgraph API["apps/api"]
        GW[HTTP Gateway / Middleware<br/>CORS, rate limit, requestId]
        AUTH_MOD[AuthModule<br/>login, JWT, guards]
        TOOLS_MOD[ToolsModule<br/>CRUD, publish]
        TAX_MOD[TaxonomyModule<br/>categories, tags]
        SEARCH_MOD[SearchModule<br/>/v1/search proxy]
        CONTENT_MOD[ContentModule<br/>faq, reviews, articles]
        MEDIA_MOD[MediaModule<br/>upload orchestration]
        WEBHOOK_MOD[WebhookModule<br/>CRUD + dispatch trigger]
        HEALTH_MOD[HealthModule<br/>/health, /ready]
        EVENT_PUB[EventPublisher<br/>enqueue domain events]
    end

    subgraph Packages
        DB_PKG[@ai-tool-cms/database]
        AUTH_PKG[@ai-tool-cms/auth]
        QUEUE_PKG[@ai-tool-cms/queue]
        STORAGE_PKG[@ai-tool-cms/storage]
    end

    GW --> AUTH_MOD
    GW --> TOOLS_MOD
    GW --> TAX_MOD
    GW --> SEARCH_MOD
    GW --> CONTENT_MOD
    GW --> MEDIA_MOD
    GW --> WEBHOOK_MOD
    GW --> HEALTH_MOD

    TOOLS_MOD --> DB_PKG
    TOOLS_MOD --> EVENT_PUB
    TAX_MOD --> DB_PKG
    SEARCH_MOD --> MEILI_EXT[(Meilisearch)]
    CONTENT_MOD --> DB_PKG
    MEDIA_MOD --> STORAGE_PKG
    MEDIA_MOD --> DB_PKG
    AUTH_MOD --> AUTH_PKG
    AUTH_MOD --> DB_PKG
    EVENT_PUB --> QUEUE_PKG
    WEBHOOK_MOD --> DB_PKG
```

---

## Worker Container Components

```mermaid
flowchart TB
    subgraph WORKER["apps/worker"]
        CONSUMER[QueueConsumer]
        AI_HANDLER[AIGenerationHandler]
        INDEX_HANDLER[SearchReindexHandler]
        SITEMAP_HANDLER[SitemapHandler]
        WEBHOOK_HANDLER[WebhookDeliveryHandler]
        NEWSLETTER_HANDLER[NewsletterHandler]
    end

    CONSUMER --> AI_HANDLER
    CONSUMER --> INDEX_HANDLER
    CONSUMER --> SITEMAP_HANDLER
    CONSUMER --> WEBHOOK_HANDLER
    CONSUMER --> NEWSLETTER_HANDLER

    AI_HANDLER --> AI_PKG[@ai-tool-cms/ai]
    INDEX_HANDLER --> DB_PKG[@ai-tool-cms/database]
    INDEX_HANDLER --> MEILI[(Meilisearch)]
    SITEMAP_HANDLER --> SEO_PKG[@ai-tool-cms/seo]
    WEBHOOK_HANDLER --> HTTP_OUT[External URLs]
```

---

## Web Container Components

```mermaid
flowchart TB
    subgraph WEB["apps/web"]
        ROUTER[App Router<br/>pages, layouts]
        SSR[Data Fetchers<br/>server components]
        SEO_COMP[SeoComponents<br/>JsonLd, meta]
        UI_COMP[Page Components]
    end

    ROUTER --> SSR
    ROUTER --> SEO_COMP
    ROUTER --> UI_COMP
    SSR -->|fetch| API_EXT[apps/api]
    SEO_COMP --> SEO_PKG[@ai-tool-cms/seo]
```

---

## Component Responsibilities

| Component | Responsibility | Must NOT |
|---|---|---|
| `AuthModule` | Issue/validate tokens, attach user to request | Contain tool business rules |
| `ToolsModule` | Tool lifecycle, validation, publish | Call Meilisearch directly (use events) |
| `SearchModule` | Query Meilisearch, map results | Write to PostgreSQL |
| `EventPublisher` | Serialize domain events to queue | Execute long jobs inline |
| `AIGenerationHandler` | Call LLM, save revision | Auto-publish without review |

---

## Related Documents

- [DDD.md](./DDD.md)
- [EventFlow.md](./EventFlow.md)
- [Modules.md](./Modules.md)
