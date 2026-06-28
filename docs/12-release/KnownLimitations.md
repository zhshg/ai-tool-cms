# Known Limitations — v1.0.0

**Version:** 1.0.0 GA  
**Last updated:** 2026-06-27

Sprint 12 不新增核心业务功能；以下为 GA 版本的已知限制与计划改进方向。

---

## API & Platform

| ID | Limitation | Workaround | Planned |
|----|------------|------------|---------|
| L-01 | Public API 路径为 `/v1/api/v1/*` | 网关 rewrite 至 `/api/v1/*` | v1.1 网关标准化 |
| L-02 | 内存速率限制（单实例） | 生产使用 Redis 限流 | v1.1 |
| L-03 | GraphQL 未包含 | 使用 REST Public API | v2.0 评估 |

## Search Console

| ID | Limitation | Workaround | Planned |
|----|------------|------------|---------|
| L-04 | GSC/Bing API 需配置凭证后方返回真实数据 | 设置 `GOOGLE_SEARCH_CONSOLE_CREDENTIALS`、`BING_WEBMASTER_API_KEY` | v1.1 完整客户端 |
| L-05 | Core Web Vitals 需 RUM 或 CrUX API | 使用 Lighthouse CI / PageSpeed API | v1.1 Analytics |

## Crawler

| ID | Limitation | Workaround | Planned |
|----|------------|------------|---------|
| L-06 | 默认 Mock 适配器 | `registerProductionSiteAdapters()` 启用真实源 | 按站点配置 |
| L-07 | Docker Compose 仅基础设施 | `pnpm dev:stack` 或 K8s 部署应用 | 文档已说明 |

## Admin

| ID | Limitation | Workaround | Planned |
|----|------------|------------|---------|
| L-08 | 开发模式 Mock RBAC（无 JWT） | 生产接入 SSO / JWT | 部署配置 |
| L-09 | Workflow 无拖拽 UI | REST API / DB 配置工作流 | v2.0 Workflow Builder |

## Infrastructure

| ID | Limitation | Workaround | Planned |
|----|------------|------------|---------|
| L-10 | Grafana 仪表盘需自行导入 | 使用 `/v1/health/metrics` | v1.1 官方 Dashboard |
| L-11 | 单元测试覆盖率 <90% | 核心包已有测试；E2E smoke 覆盖主路径 | 持续补充 |

## SEO

| ID | Limitation | Workaround | Planned |
|----|------------|------------|---------|
| L-12 | IndexNow 需配置 `BING_INDEXNOW_KEY` | 手动提交 sitemap ping | 已支持 ping API |
| L-13 | 404 监控依赖应用层日志 | 配置 redirect 规则 | Admin SEO Dashboard |

---

## Non-Goals (v1.0)

- SaaS 多租户云版本 → v2.0
- Mobile App → v2.0
- Browser Extension → v2.0
- Enterprise Edition → v2.0
- Plugin Marketplace → v1.1

---

## Reporting

新问题请使用 GitHub Issues，标签：`bug`、`known-issue`、`enhancement`。
