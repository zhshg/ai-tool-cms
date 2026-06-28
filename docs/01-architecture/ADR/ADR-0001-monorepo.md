# ADR-0001: Adopt pnpm + Turborepo Monorepo

> **Status:** Accepted  
> **Date:** 2026  
> **Deciders:** Project Architecture Team

---

## Context

AI Tool CMS v2 comprises multiple deployable applications (Web, Admin, API, Worker, Crawler, Scheduler) and shared libraries (database, auth, seo, ai, ui). We need a repository structure that supports:

- Shared TypeScript types and DTOs across frontend and backend
- Independent build and deploy per app
- Fast CI through incremental builds
- Clear dependency boundaries

Alternatives considered: npm workspaces without Turborepo, Nx, separate repositories per service.

---

## Decision

Adopt a **pnpm workspace** monorepo orchestrated by **Turborepo**.

| Choice | Rationale |
|---|---|
| **pnpm** | Efficient disk usage, strict dependency resolution, `workspace:*` protocol |
| **Turborepo** | Task caching, `dependsOn` build graph, simple config |
| **Single repo** | Atomic cross-package changes, one PR for feature + types + API |

Repository layout: `apps/*`, `packages/*` per [Modules.md](../Modules.md).

---

## Consequences

### Positive

- Shared `@ai-tool-cms/types` prevents API/Web drift
- CI builds only affected packages
- Contributors clone one repository

### Negative

- Monorepo tooling learning curve
- All apps share release coordination (mitigated by independent Docker images)

### Neutral

- Requires `turbo.json` maintenance
- Root `package.json` owns shared devDependencies

---

## Compliance

- New apps must register in `pnpm-workspace.yaml` and `turbo.json`
- Cross-app imports forbidden — see [DependencyGraph.md](../DependencyGraph.md)

---

## Related

- [ADR-0002-nextjs.md](./ADR-0002-nextjs.md)
- [FolderStructure.md](../../00-project/FolderStructure.md)
