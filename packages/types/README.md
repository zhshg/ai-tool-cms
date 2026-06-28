# @ai-tool-cms/types

Shared domain TypeScript types for all apps and packages.

**Status:** Infrastructure scaffold — pure types, no runtime dependencies. Aligns with [RFC-0001](../../docs/01-architecture/RFC/RFC-0001-tool-model.md) and [DDD.md](../../docs/01-architecture/DDD.md).

## Usage

```typescript
import type {
  Tool,
  Category,
  Prompt,
  Review,
  Pricing,
  SearchResult,
  User,
  ToolStatus,
  PricingModel,
} from "@ai-tool-cms/types";
```

## Exported types

| Type | Purpose |
|---|---|
| `Tool` | Catalog aggregate root |
| `Category` | Taxonomy category |
| `Prompt` | Prompt library template |
| `Review` | Tool review / editorial feedback |
| `Pricing` | Pricing model + optional tiers |
| `SearchResult` | Meilisearch-style search payload |
| `User` | Identity user (no secrets) |
| `Role` | RBAC role with permission bindings |

Summary variants (`ToolSummary`, `CategorySummary`, `RoleSummary`, etc.) are provided for list and search views.

## Enums

String union constants exported as both types and `*Enum` objects:

- `ToolStatus` — `DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`
- `PricingModel` — `FREE`, `FREEMIUM`, `PAID`, `CONTACT`
- `ReviewStatus`, `PromptStatus`, `BillingPeriod`

## Scripts

```bash
pnpm --filter @ai-tool-cms/types build
pnpm --filter @ai-tool-cms/types typecheck
```

## Layout

```
packages/types/src/
├── common.ts          # Shared enums + timestamps
├── tool.ts
├── category.ts
├── prompt.ts
├── review.ts
├── pricing.ts
├── search-result.ts
├── user.ts
├── role.ts
└── index.ts
```

## Consumers

| Consumer | Usage |
|---|---|
| `apps/api` | DTO mapping, OpenAPI response shapes |
| `apps/web` | SSR props, search UI |
| `apps/admin` | Forms and tables |
| `apps/worker` | Index payloads |
| `apps/crawler` | Normalized drafts → `Tool` |
