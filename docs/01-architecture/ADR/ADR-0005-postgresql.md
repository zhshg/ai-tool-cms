# ADR-0005: PostgreSQL as System of Record

> **Status:** Accepted  
> **Date:** 2026  
> **Deciders:** Project Architecture Team

---

## Context

The platform stores relational content: tools, taxonomy, users, RBAC, jobs metadata, audit events, and revisions. Requirements:

- ACID transactions for publish workflow
- Complex queries for admin dashboards
- Mature self-host story for open source adopters
- JSON columns where flexible metadata needed

Alternatives: MySQL, MongoDB (primary), CockroachDB.

---

## Decision

Use **PostgreSQL 15+** as the **authoritative** data store for all domain entities.

| Derived store | Relationship |
|---|---|
| Meilisearch | Search index rebuilt from PG |
| Redis | Cache and queues—not source of truth |
| S3 | Media bytes; metadata in PG |

---

## Consequences

### Positive

- Strong consistency for publish and RBAC
- Excellent JSON support (`jsonb`) for flexible fields
- Wide hosting support (Docker, managed RDS, etc.)

### Negative

- Vertical scaling limits without read replicas
- Full-text search in PG inferior to Meilisearch (accepted—use Meili for search)

### Scaling path

- Connection pooling (PgBouncer)
- Read replicas for reporting (future)
- Table indexing per [Database.md](../Database.md) (planned)

---

## Compliance

- Workers and Crawler write through API or `database` package with same invariants
- Backups required for production—see [DeploymentDiagram.md](../DeploymentDiagram.md)

---

## Related

- [DataFlow.md](../DataFlow.md)
- [ADR-0004-prisma.md](./ADR-0004-prisma.md)
