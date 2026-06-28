# Container Diagram (C4 Level 2)

> **Document Type:** C4 Container Diagram  
> **Version:** 2.0.0  
> **Status:** Draft

---

## Containers

A **container** is a separately deployable unit (process or data store).

```mermaid
flowchart TB
    subgraph Clients
        BROWSER[Browser]
    end

    subgraph Platform["AI Tool CMS v2"]
        WEB["Web Container<br/>Next.js :3000"]
        ADMIN["Admin Container<br/>Next.js :3001"]
        API["API Container<br/>NestJS :4000"]
        WORKER["Worker Container<br/>BullMQ Consumer"]
        CRAWLER["Crawler Container<br/>Ingestion"]
        SCHED["Scheduler Container<br/>Cron"]

        PG[("PostgreSQL<br/>System of Record")]
        REDIS[("Redis<br/>Cache + Queue")]
        MEILI[("Meilisearch<br/>Search Index")]
        S3[("Object Storage<br/>S3/MinIO")]
    end

    subgraph External
        LLM[LLM APIs]
        SRC[External Sources]
    end

    BROWSER --> WEB
    BROWSER --> ADMIN
    WEB -->|REST /v1| API
    ADMIN -->|REST /v1 + JWT| API

    API --> PG
    API --> REDIS
    API --> MEILI
    API --> S3
    API -->|enqueue| REDIS

    WORKER --> REDIS
    WORKER --> PG
    WORKER --> MEILI
    WORKER --> S3
    WORKER --> LLM

    CRAWLER --> SRC
    CRAWLER -->|draft write| API
    CRAWLER --> REDIS
    CRAWLER --> S3

    SCHED --> REDIS
    SCHED --> CRAWLER
```

---

## Container Catalog

| Container | Technology | Responsibilities |
|---|---|---|
| **Web** | Next.js 15 | SSR/ISR public pages, SEO metadata, visitor UX |
| **Admin** | Next.js 15 | Authenticated CMS, review queues, settings |
| **API** | NestJS | REST `/v1/`, auth, RBAC, OpenAPI, health |
| **Worker** | Node + BullMQ | AI jobs, reindex, webhooks, sitemap |
| **Crawler** | Node | Source fetch, normalize, draft creation |
| **Scheduler** | Node + cron | Trigger crawls, scheduled publish, sitemap refresh |
| **PostgreSQL** | PostgreSQL 15+ | Authoritative relational data |
| **Redis** | Redis 7+ | Sessions, cache, BullMQ backend |
| **Meilisearch** | Meilisearch | Full-text and faceted search |
| **Object Storage** | MinIO/S3 | Logos, screenshots, uploads |

---

## Communication Protocols

| From | To | Protocol | Sync/Async |
|---|---|---|---|
| Web | API | HTTPS REST | Sync |
| Admin | API | HTTPS REST + JWT | Sync |
| API | PostgreSQL | TCP (Prisma) | Sync |
| API | Redis | TCP | Sync |
| API | Queue | Redis protocol | Async (enqueue) |
| Worker | Queue | Redis protocol | Async (consume) |
| Integrator | API | HTTPS REST + API Key | Sync |

---

## Container Constraints

| Container | Must be stateless? | Scales horizontally? |
|---|---|---|
| Web | Yes | Yes |
| Admin | Yes | Yes |
| API | Yes | Yes |
| Worker | Yes | Yes (pool) |
| Crawler | Yes | Yes |
| Scheduler | Single leader preferred | Limited |
| PostgreSQL | No | Read replicas (future) |
| Redis | Yes (cluster optional) | Yes |
| Meilisearch | Index state | Yes |

---

## Related Documents

- [ComponentDiagram.md](./ComponentDiagram.md)
- [DeploymentDiagram.md](./DeploymentDiagram.md)
- [Modules.md](./Modules.md)
