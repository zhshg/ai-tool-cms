# @ai-tool-cms/common

Cross-cutting shared utilities — constants, enums, errors, helpers, and validators.

**Status:** Infrastructure scaffold — no domain orchestration logic. Depends on `@ai-tool-cms/types`.

## Usage

```typescript
import {
  API_VERSION,
  ToolStatus,
  AppError,
  slugify,
  parseSlug,
  normalizePagination,
  createPaginatedResult,
} from "@ai-tool-cms/common";
```

## Modules

| Module | Contents |
|---|---|
| `constants` | API version, pagination defaults, slug rules, HTTP status map |
| `enums` | Re-exports domain enums from `@ai-tool-cms/types` |
| `errors` | `AppError`, `ValidationError`, `NotFoundError`, `ApiErrorBody` |
| `helpers` | `slugify`, pagination helpers, string utilities |
| `validators` | Zod schemas + `parseSlug`, `parseEmail`, `parsePaginationQuery` |

## Errors

```typescript
import { NotFoundError, toApiErrorBody } from "@ai-tool-cms/common";

throw new NotFoundError("Tool not found", { slug: "chatgpt" });

const body = toApiErrorBody(error);
// { code: "NOT_FOUND", message: "...", details?: ... }
```

## Validators

```typescript
import { parseSlug, safeParseSlug, paginationQuerySchema } from "@ai-tool-cms/common";

const slug = parseSlug("ChatGPT Pro"); // throws on invalid
const result = safeParseSlug(input);
const query = paginationQuerySchema.parse({ page: "1", limit: "20" });
```

## Scripts

```bash
pnpm --filter @ai-tool-cms/common build
pnpm --filter @ai-tool-cms/common typecheck
```

## Layout

```
packages/common/src/
├── constants/
├── enums/
├── errors/
├── helpers/
├── validators/
└── index.ts
```

## Consumers

| Consumer | Typical use |
|---|---|
| `apps/api` | DTO validation, HTTP error mapping |
| `apps/web` | Slug helpers, pagination UI |
| `apps/admin` | Form validators |
| `apps/worker` | Error handling in jobs |
| `packages/*` | Shared primitives |
