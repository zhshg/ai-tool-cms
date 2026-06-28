# @ai-tool-cms/database

Shared Prisma client singleton for the monorepo.

**Status:** Infrastructure only — no business models. Schema lives in root `prisma/schema.prisma`.

## Usage

```typescript
import { prisma } from "@ai-tool-cms/database";

await prisma.$queryRaw`SELECT 1`;
```

Do **not** instantiate `PrismaClient` in apps. Import the shared `prisma` singleton from this package.

```typescript
import { connectPrisma, disconnectPrisma, prisma } from "@ai-tool-cms/database";
```

## Layout

```
packages/database/
├── package.json
├── tsconfig.json
├── README.md
├── prisma.config.ts
└── src/
    ├── index.ts
    ├── client.ts
    └── prisma.ts
```

## Scripts

```bash
pnpm --filter @ai-tool-cms/database db:generate
pnpm --filter @ai-tool-cms/database build
```

From repository root:

```bash
pnpm db:generate
pnpm build
```

## Consumers

| App | Pattern |
|---|---|
| `apps/api` | `PrismaService` delegates to `prisma` |
| `apps/worker` | `import { prisma } from "@ai-tool-cms/database"` |
| `apps/crawler` | `import { prisma } from "@ai-tool-cms/database"` |
| `apps/admin` | server routes / actions when needed |
