# Sequence: Crawler

> **Document Type:** Interaction Sequence  
> **Version:** 2.0.0  
> **Status:** Draft

---

## 1. Scheduled Crawl

```mermaid
sequenceDiagram
    participant SCH as apps/scheduler
    participant Q as BullMQ
    participant CRW as apps/crawler
    participant SRC as External Source
    participant API as apps/api
    participant PG as PostgreSQL

    SCH->>Q: add CrawlJobScheduled { sourceId }
    Q->>CRW: consume job
    CRW->>PG: INSERT crawl_jobs RUNNING
    CRW->>SRC: HTTPS fetch (rate limited)
    SRC-->>CRW: HTML/JSON payload
    CRW->>CRW: Adapter normalize → NormalizedToolDraft[]
    loop each draft
        CRW->>API: POST /v1/tools (internal) or IngestionService
        API->>PG: UPSERT tool DRAFT/IN_REVIEW
    end
    CRW->>PG: UPDATE crawl_job COMPLETED
```

**Invariant:** Crawler never sets `status=PUBLISHED`.

---

## 2. Manual Crawl (Admin)

```mermaid
sequenceDiagram
    participant ADM as apps/admin
    participant API as apps/api
    participant Q as BullMQ
    participant CRW as apps/crawler

    ADM->>API: POST /v1/crawler/jobs { sourceId }
    API->>API: Check crawler:run permission
    API->>Q: enqueue crawl job
    API-->>ADM: 202 { jobId }
    Q->>CRW: process (same as scheduled)
```

---

## 3. Adapter Plugin Flow

```mermaid
flowchart LR
    JOB[Crawl Job] --> REG[Adapter Registry]
    REG --> A1[ProductHuntAdapter]
    REG --> A2[GitHubAdapter]
    REG --> A3[RssAdapter]
    A1 --> NORM[NormalizedToolDraft]
    A2 --> NORM
    A3 --> NORM
    NORM --> INGEST[Ingestion API]
```

See [RFC/RFC-0002-crawler.md](../RFC/RFC-0002-crawler.md).

---

## 4. Deduplication

| Key | Rule |
|---|---|
| `website` URL | Canonical host + path; update existing draft |
| `slug` | Generated from name; conflict → suffix |
| Source ID | Stored on tool for traceability |

---

## 5. Error Handling

| Failure | Behavior |
|---|---|
| HTTP 429 from source | Backoff, retry job |
| Parse error | Log + skip record; job partial success |
| Total failure | Job FAILED; visible in Admin monitor |
| robots.txt disallow | Respect; skip source |

---

## 6. Media Download (Logo)

```mermaid
sequenceDiagram
    participant CRW as crawler
    participant S3 as Object Storage
    participant API as apps/api

    CRW->>CRW: Extract logo URL from page
    CRW->>S3: PUT object
    CRW->>API: PATCH tool { logoMediaId }
```

---

## Related Documents

- [RFC/RFC-0002-crawler.md](../RFC/RFC-0002-crawler.md)
- [DataFlow.md](../DataFlow.md)
- [EventFlow.md](../EventFlow.md)
