# @ai-tool-cms/config

Centralized environment configuration with Zod validation.

**Status:** Infrastructure scaffold — validates and types env vars from root `.env`.

## Usage

```typescript
import config, { getConfig } from "@ai-tool-cms/config";

const dbUrl = config.database.url;
const redisUrl = config.redis.url;
const meiliUrl = config.meili.url;
const openaiKey = config.ai.openaiApiKey;
const googleKey = config.ai.googleApiKey;
```

`getConfig()` returns a cached singleton. Call `resetConfig()` in tests to re-parse env.

## Environment variables

| Config path | Env variable(s) |
|---|---|
| `database.url` | `DATABASE_URL` |
| `redis.url` | `REDIS_URL` |
| `meili.url` | `MEILI_URL`, `MEILISEARCH_URL`, `MEILISEARCH_HOST` |
| `ai.openaiApiKey` | `OPENAI_API_KEY`, `OPENAI_KEY` |
| `ai.googleApiKey` | `GOOGLE_API_KEY` |
| `api.port` | `PORT`, `API_PORT` |
| `queue.url` | `QUEUE_URL` |
| `auth.jwtSecret` | `JWT_SECRET` |
| `storage.endpoint` | `STORAGE_ENDPOINT` |
| `log.level` | `LOG_LEVEL` |
| `site.name` | `SITE_NAME` |

See root `.env.example` for the full list.

## Scripts

```bash
pnpm --filter @ai-tool-cms/config build
pnpm --filter @ai-tool-cms/config typecheck
```

## Layout

```
packages/config/
├── src/
│   ├── schema.ts    # Zod schema + AppConfig type
│   ├── parse.ts     # process.env → validated config
│   └── index.ts     # default export + getConfig()
├── package.json
└── tsconfig.json
```

## Consumers

| App | Usage |
|---|---|
| `apps/api` | Nest `ConfigModule.load([() => getConfig()])` |
| `apps/worker` | Job bootstrap |
| `apps/crawler` | Crawler bootstrap |
| `apps/admin` | Server routes / actions |

Load `.env` in each app before importing config (Next.js and Nest `ConfigModule` handle this).
