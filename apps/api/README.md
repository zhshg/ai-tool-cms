# api

REST API service — **NestJS** scaffold (Commit-0004).

## Stack

| Technology | Purpose |
|---|---|
| NestJS 11 | HTTP API framework |
| Swagger (`/docs`) | OpenAPI documentation |
| Config Module | Environment configuration |
| Prisma Module | Database client lifecycle |
| Health (`/health`) | Liveness and DB status |
| Pino (`AppLoggerService`) | Structured logging |

## Development

From repository root:

```bash
pnpm install
pnpm dev:api
```

Open:

- API health: [http://localhost:4000/health](http://localhost:4000/health)
- Swagger: [http://localhost:4000/docs](http://localhost:4000/docs)

Optional: start PostgreSQL via Docker before dev if you need a live Prisma connection:

```bash
docker compose up -d postgres
```

Without PostgreSQL, the API still starts; `/health` reports `database: false`.

**Status:** Framework scaffold only — no business modules yet.
