# RFC-0001: Canonical Tool Model and Lifecycle

> **Status:** Accepted  
> **Authors:** Project Architecture Team  
> **Created:** 2026

---

## Summary

Define the **Tool** aggregate as the central catalog entity: fields, state machine, invariants, API surface, and events. All ingestion paths (manual, API, crawler, AI) converge on this model.

---

## Motivation

- Multiple features (directory, compare, SEO, search, crawler) depend on a stable Tool shape
- Without a canonical RFC, crawler and AI pipelines invent parallel schemas
- Publish workflow is the system's critical transaction

---

## Detailed Design

### Entity: Tool

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | Primary key |
| `slug` | string | Yes | Unique, kebab-case, URL segment |
| `name` | string | Yes | Display name |
| `description` | text | Yes for publish | Markdown or HTML sanitized |
| `summary` | string | No | Short blurb for cards |
| `website` | URL | Yes | Unique among non-archived |
| `pricing` | enum | Yes | FREE, FREEMIUM, PAID, CONTACT |
| `status` | enum | Yes | See state machine |
| `metaTitle` | string | Publish gate | SEO |
| `metaDescription` | string | Publish gate | SEO |
| `logoMediaId` | FK | No | MediaAsset |
| `publishedAt` | datetime | If PUBLISHED | |
| `scheduledAt` | datetime | If scheduled | |
| `createdAt` / `updatedAt` | datetime | Yes | Audit |

### Relationships

- M:N `categories` via `tool_categories`
- M:N `tags` via `tool_tags`
- 1:N `faqs`, `reviews`, `content_revisions`

### State Machine

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED
                  ↘ DRAFT (reject)
APPROVED → SCHEDULED → PUBLISHED (scheduler)
PUBLISHED → DRAFT (revert - admin only)
```

### Domain Events

| Transition | Event |
|---|---|
| → PUBLISHED | `ToolPublished` |
| → ARCHIVED | `ToolArchived` |

### API Surface

| Method | Path | Permission |
|---|---|---|
| GET | `/v1/tools` | Public (published) / admin (all) |
| GET | `/v1/tools/:id` | Public / admin |
| POST | `/v1/tools` | `tools:create` |
| PATCH | `/v1/tools/:id` | `tools:update` |
| DELETE | `/v1/tools/:id` | `tools:delete` (soft archive preferred) |

---

## Drawbacks

- Rich model increases migration complexity
- Strict website uniqueness may block legitimate duplicates (mitigate: manual override flag)

---

## Alternatives Considered

| Alternative | Rejected because |
|---|---|
| Schema-less tool JSON document | Breaks SEO, search, and validation |
| Separate tables per tool type (agent vs API) | Premature; extend Tool with `toolType` enum later |

---

## Rollout Plan

1. Prisma schema + migration
2. API CRUD + OpenAPI
3. Admin editor
4. Public detail page
5. Search index mapping
6. Crawler ingestion mapping

---

## Unresolved Questions

- `toolType` enum timing (TOOL, AGENT, API_PRODUCT) — v2.1
- Pricing tiers as child table vs JSON — child table preferred at scale

---

## Related

- [DDD.md](../DDD.md)
- [Sequence/SEO.md](../Sequence/SEO.md)
- User stories US-ED-001 – US-ED-004, US-V-007
