# AI Tool CMS

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](./VERSION)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

![AI Tool CMS](media/banner/github-readme-banner.svg)

**开源 AI 工具内容管理系统** — 采集、AI 增强、SEO 优化、一键发布。配套 REST API、MCP Server、TypeScript SDK 与生产级运维工具链。

**v1.0.0 GA** — Production · 24×7 · Open Source · Stable · Documented · Observable · Maintainable

## 特性

- 🤖 **AI 流水线** — 多模型生成、审核工作流、质量评分
- 🔍 **混合搜索** — Meilisearch + 语义向量
- 📈 **SEO 引擎** — Sitemap、JSON-LD、对比页、内链系统
- 🌍 **10+ 语言** — i18n、hreflang、区域 SEO
- 🔌 **开放生态** — Public API v1、MCP、Webhooks、Plugin Framework
- 🛡️ **生产就绪** — 监控、备份、CI/CD、安全加固

## 30 分钟快速开始

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

| 服务 | URL |
|------|-----|
| Website | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |

## Docker

```bash
docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0
```

## 文档

| 文档 | 说明 |
|------|------|
| [Getting Started](./docs/GettingStarted.md) | 30 分钟部署 |
| [API Reference](./docs/API.md) | REST · SDK · MCP |
| [Operations](./docs/operations/README.md) | 运维手册 |
| [RELEASE.md](./RELEASE.md) | v1.0.0 发布说明 |
| [Examples](./examples/README.md) | 示例代码 |

## 架构

```
                AI Tool Platform
                     Database
                         │
     ┌────────────┬──────────────┬────────────┬────────────┐
     ▼            ▼              ▼            ▼            ▼
   Website    REST API v1    MCP Server    Webhook Hub    SDK
```

## 路线图

- [v1.1](./ROADMAP_v1.1.md) — AI Agent Dashboard、Prompt Library、Plugin Marketplace
- [v2.0](./ROADMAP_v2.0.md) — Workflow Builder、Enterprise、SaaS Cloud
- [Vision 2027](./VISION_2027.md)

## 贡献

欢迎贡献！见 [CONTRIBUTING.md](./.github/CONTRIBUTING.md) 与 [Code of Conduct](./.github/CODE_OF_CONDUCT.md)。

## 许可证

[MIT](./LICENSE) © 2026 AI Tool CMS Contributors
