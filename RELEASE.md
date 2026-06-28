# AI Tool CMS v1.0.0 — General Availability

**Release Date:** 2026-06-27  
**Codename:** Version 1.0 GA

## Highlights

- **Production Ready** — Monitoring, backups, CI/CD, security hardening
- **Open Ecosystem** — Public REST API v1, MCP Server, TypeScript SDK, Webhooks
- **Full Documentation** — Developer handbook, operations manual, examples
- **Official Website** — Landing, pricing, docs, blog, changelog, showcase
- **Open Source** — MIT License, community templates, contribution guides

## Quick Start

```bash
git clone https://github.com/zhshg/ai-tool-cms.git
cd ai-tool-cms
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev:stack
```

| Service | URL |
|---------|-----|
| Website | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |

## Docker

```bash
docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0
```

## Upgrade from RC / Prod Preview

```bash
pnpm db:migrate:deploy
# Update image tag to 1.0.0
# See docs/operations/Upgrade.md
```

## Breaking Changes

None from `1.0.0-rc.1` — GA is a documentation and release packaging milestone.

## Documentation

| Doc | Path |
|-----|------|
| Getting Started | `docs/GettingStarted.md` |
| API Reference | `docs/API.md` |
| Operations | `docs/operations/` |
| Release Review | `docs/12-release/` |
| Roadmap v1.1 | `ROADMAP_v1.1.md` |
| Roadmap v2.0 | `ROADMAP_v2.0.md` |

## Known Limitations

See [docs/12-release/KnownLimitations.md](./docs/12-release/KnownLimitations.md)

## Checksums

Git tag: `v1.0.0`

```bash
git checkout v1.0.0
pnpm install --frozen-lockfile
pnpm build
```

## Support

- [GitHub Discussions](https://github.com/zhshg/ai-tool-cms/discussions)
- [.github/SUPPORT.md](./.github/SUPPORT.md)

---

**AI Tool CMS v1.0.0 — Production · 24×7 · Open Source · Stable · Documented · Observable · Maintainable**
