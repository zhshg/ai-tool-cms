# ADR-0003: NestJS for REST API

> **Status:** Accepted  
> **Date:** 2026  
> **Deciders:** Project Architecture Team

---

## Context

A central backend must expose versioned REST endpoints for Web, Admin, Worker, Crawler, and external integrators. Requirements:

- Modular architecture (per-domain Nest modules)
- OpenAPI / Swagger generation
- Guards for JWT and RBAC
- Validation pipes for DTOs
- Ecosystem maturity for enterprise contributors

Alternatives: Fastify raw, Express, tRPC (rejected—not REST-first), Hono.

---

## Decision

Use **NestJS** for `apps/api` as the **sole HTTP mutation and query authority** for business logic.

| Aspect | Choice |
|---|---|
| API style | REST `/v1/` |
| Documentation | `@nestjs/swagger` at `/docs` |
| Auth | JWT guards + custom permission guard |
| ORM integration | Prisma via `@ai-tool-cms/database` |

---

## Consequences

### Positive

- Clear module boundaries map to DDD contexts
- Decorator-based guards align with RBAC matrix
- Large ecosystem and hiring pool

### Negative

- Heavier framework than minimal Fastify
- Boilerplate for small endpoints

### Mitigation

- Thin controllers; domain logic in services
- Shared DTOs in `@ai-tool-cms/types`

---

## Compliance

- No business logic in `apps/web` or `apps/admin` that bypasses API
- Breaking changes require `/v2/` ADR and deprecation window

---

## Related

- [ComponentDiagram.md](../ComponentDiagram.md)
- [RequestFlow.md](../RequestFlow.md)
- [ADR-0004-prisma.md](./ADR-0004-prisma.md)
