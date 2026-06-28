# @ai-tool-cms/database

Prisma client singleton and database connection helpers.

**Status:** Infrastructure scaffold — no business models yet. Schema lives in root `prisma/schema.prisma`.

## Usage

```typescript
import { prisma } from "@ai-tool-cms/database";

const health = await prisma.$queryRaw`SELECT 1`;
```

Connection lifecycle helpers:

```typescript
import { connectPrisma, disconnectPrisma, prisma } from "@ai-tool-cms/database";

await connectPrisma();
// ... use prisma
await disconnectPrisma();
```

## Consumers

| App / package | Import |
|---|---|
| `apps/api` | Nest `PrismaService` wraps `prisma` |
| `apps/worker` | Job handlers |
| `apps/crawler` | Persistence adapters |
| `apps/admin` | Server actions / route handlers (when needed) |

## Scripts

From repository root:

```bash
pnpm db:generate              # Generate Prisma Client (uses prisma.config.ts)
pnpm --filter @ai-tool-cms/database build
```

`apps/api` runs `database` build automatically in `predev` / `prebuild`.

From this package:

```bash
pnpm build         # db:generate + compile to dist/
pnpm typecheck
```

## Layout

```
packages/database/
├── src/
│   ├── client.ts    # PrismaClient factory
│   ├── prisma.ts    # Singleton + connect/disconnect
│   └── index.ts     # Public exports
├── package.json
└── tsconfig.json
```
