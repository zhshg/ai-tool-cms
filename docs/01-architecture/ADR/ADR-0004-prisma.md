# ADR-0004: Prisma ORM and Migrations

> **Status:** Accepted  
> **Date:** 2026  
> **Deciders:** Project Architecture Team

---

## Context

PostgreSQL is the system of record. We need:

- Type-safe database access in TypeScript
- Version-controlled schema migrations
- Generated client shared across API, Worker, Crawler

Alternatives: Drizzle ORM, TypeORM, raw SQL, Knex.

---

## Decision

Use **Prisma** with schema in `prisma/schema.prisma` and migrations in `prisma/migrations/`.

| Aspect | Policy |
|---|---|
| Client package | `@ai-tool-cms/database` exports singleton |
| Migrations | `prisma migrate deploy` in CI/CD |
| Seeds | `prisma/seed.ts` for dev bootstrap |
| Naming | snake_case columns per [NamingConvention.md](../../00-project/NamingConvention.md) |

---

## Consequences

### Positive

- Generated types align with API DTOs
- Migration history in git
- Strong contributor documentation

### Negative

- Prisma bundle size in serverless (not applicable—long-running containers)
- Complex raw SQL requires `$queryRaw`

### Rules

- Schema changes require migration in same PR
- No manual production schema edits

---

## Related

- [ADR-0005-postgresql.md](./ADR-0005-postgresql.md)
- [DDD.md](../DDD.md)
- [RFC/RFC-0001-tool-model.md](../RFC/RFC-0001-tool-model.md)
