# v1.0.0 General Availability Launch

**Date:** 2026-06-27  
**Status:** 🚀 LIVE

## Release Artifacts

| Artifact | Location |
|----------|----------|
| GitHub Release | `v1.0.0` tag |
| Docker Image | `ghcr.io/zhshg/ai-tool-cms:1.0.0` |
| Documentation | `docs/` + `https://your-domain.com/docs` |
| API Docs | `{API_URL}/api/docs` |
| Official Website | `https://your-domain.com` |

## Launch Commands

```bash
# Pull release
git fetch --tags
git checkout v1.0.0

# Docker
docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0

# Deploy
pnpm db:migrate:deploy
# See docs/operations/Upgrade.md
```

## Post-Launch Checklist

- [x] GitHub Release published
- [x] CHANGELOG.md updated
- [x] RELEASE.md published
- [x] Documentation site content ready
- [x] Official landing page live (apps/web)
- [ ] Production domain DNS configured
- [ ] Search Console verification
- [ ] Product Hunt launch
- [ ] Community announcement (Discussions)

## Monitoring First 72 Hours

1. `/v1/health/ready` uptime
2. SEO Dashboard daily report
3. Error rate (Sentry)
4. Queue depth
5. Backup cron success

## Announcement Template

> 🎉 AI Tool CMS v1.0.0 is now Generally Available!
>
> Open-source AI tool directory platform with crawler, AI pipeline, SEO engine, Public API, MCP Server, and production ops tooling.
>
> ⭐ https://github.com/zhshg/ai-tool-cms
> 📖 https://your-domain.com/docs
> 🐳 docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0

## Next Steps

- [ROADMAP_v1.1.md](../../ROADMAP_v1.1.md)
- [VISION_2027.md](../../VISION_2027.md)
