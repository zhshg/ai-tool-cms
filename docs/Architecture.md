# 架构概览

AI Tool CMS 是基于 **Turborepo Monorepo** 的全栈 AI 工具内容管理平台。

## 系统上下文

```
                    ┌─────────────────┐
                    │   AI Tool CMS   │
                    └────────┬────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
    Content Editors      Developers          End Users
```

## 容器图

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Web    │  │  Admin   │  │ Public   │
│ Next.js  │  │ Next.js  │  │ API v1   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   ▼
            ┌──────────────┐
            │  API (Nest)  │
            └──────┬───────┘
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
 PostgreSQL     Redis      Meilisearch
     │             │
     ▼             ▼
  Prisma        BullMQ → Worker / Scheduler
```

## 应用层 (`apps/`)

| App | 技术 | 职责 |
|-----|------|------|
| `web` | Next.js 15 | 面向用户的工具目录站 |
| `admin` | Next.js 15 | 管理后台 |
| `api` | NestJS | REST API（Admin + Public） |
| `worker` | Node | 异步任务（AI、爬虫、SEO） |
| `scheduler` | Node | 定时任务 |
| `crawler` | Node | 采集服务 |

## 共享包 (`packages/`)

核心包：`database`、`auth`、`seo`、`ai`、`crawler-core`、`search`、`queue`、`monitoring`、`cache`、`public-api`、`mcp-server`、`sdk`、`workflow`、`plugins`。

## 数据流

1. **采集** — Crawler → Normalize → Dedup → DB
2. **AI** — Prompt → Generate → Review → Publish
3. **SEO** — Sitemap / Schema / Internal Links / Compare Pages
4. **开放** — Public API / MCP / Webhooks / SDK

## 详细设计

- [docs/01-architecture/](./01-architecture/) — ADR、序列图、部署图
- [docs/01-architecture/Architecture.md](./01-architecture/Architecture.md)

## 扩展点

- **Plugin Framework** — `onToolCreated`、`beforePublish` 等生命周期钩子
- **Workflow Engine** — 可配置发布流水线
- **Feature Flags** — 按 locale / region 灰度
