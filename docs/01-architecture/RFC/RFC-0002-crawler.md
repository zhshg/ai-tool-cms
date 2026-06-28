# RFC-0002: Crawler Engine and Adapter Architecture

> **Status:** Accepted  
> **Authors:** Project Architecture Team  
> **Created:** 2026

---

## Summary

Define the **crawler subsystem**: job model, adapter interface, normalization pipeline, rate limiting, and integration with Tool ingestion—without auto-publish.

---

## Motivation

Manual cataloging cannot keep pace with the AI tools market. Crawlers must:

- Support heterogeneous sources (HTML, JSON APIs, RSS)
- Respect politeness and legal constraints
- Produce drafts for human review
- Allow plugin adapters without core forks

---

## Detailed Design

### Components

| Component | Location | Role |
|---|---|---|
| `CrawlScheduler` | `apps/scheduler` | Enqueue jobs on cron |
| `CrawlWorker` | `apps/crawler` | Execute fetch + parse |
| `AdapterRegistry` | `packages/crawler-core` | Source-specific parsers |
| `Normalizer` | `packages/crawler-core` | → `NormalizedToolDraft` |
| `IngestionService` | `apps/api` | Apply drafts to Tool aggregate |

### Adapter Interface (Conceptual)

| Method | Responsibility |
|---|---|
| `sourceId` | Unique adapter key |
| `fetch(cursor)` | Return raw pages/batches |
| `parse(raw)` | Return `NormalizedToolDraft[]` |
| `rateLimit` | Requests per minute |

### NormalizedToolDraft

| Field | Source mapping |
|---|---|
| `name` | Required |
| `website` | Required; dedup key |
| `description` | Optional excerpt |
| `externalId` | Source-native ID |
| `sourceMeta` | jsonb trace |

### CrawlJob Entity

| Status | Meaning |
|---|---|
| PENDING | Queued |
| RUNNING | In progress |
| COMPLETED | Success (partial allowed) |
| FAILED | Error; retryable |

### Politeness

- Configurable delay between requests
- `robots.txt` compliance per source
- User-Agent identification
- Admin disable per source

---

## Drawbacks

- Crawler maintenance is ongoing as sources change markup
- Legal/compliance varies by jurisdiction—operators responsible for ToS

---

## Alternatives Considered

| Alternative | Rejected because |
|---|---|
| Inline crawl in API request | Blocks HTTP; poor scale |
| Direct DB write from crawler | Bypasses domain validation |
| Third-party-only ingestion (no crawler) | Insufficient automation for vision |

---

## Rollout Plan

1. `crawler-core` package + mock adapter
2. `CrawlJob` schema + API monitor endpoints
3. Product Hunt + RSS adapters
4. Admin manual trigger
5. Scheduler cron
6. Plugin adapter hook ([Modules.md](../Modules.md) PLG)

---

## Unresolved Questions

- Headless browser (Playwright) for SPA sites — opt-in adapter, high cost
- Change detection diff UI — v2.1

---

## Related

- [Sequence/Crawler.md](../Sequence/Crawler.md)
- [RFC/RFC-0001-tool-model.md](./RFC-0001-tool-model.md)
- Feature IDs FE-CRW-*
