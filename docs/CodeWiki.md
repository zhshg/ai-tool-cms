# AI Tool CMS Code Wiki

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 整体架构](#2-整体架构)
- [3. 主要应用模块](#3-主要应用模块)
- [4. 共享包模块](#4-共享包模块)
- [5. 数据库模型](#5-数据库模型)
- [6. 关键类与函数](#6-关键类与函数)
- [7. 依赖关系](#7-依赖关系)
- [8. 项目运行方式](#8-项目运行方式)
- [9. 部署与运维](#9-部署与运维)

---

## 1. 项目概述

### 1.1 项目定位

**AI Tool CMS** 是一个开源的 AI 工具内容管理系统，用于采集、AI 增强、SEO 优化和一键发布 AI 工具目录。项目提供 REST API、MCP Server、TypeScript SDK 与生产级运维工具链。

### 1.2 核心特性

| 特性 | 说明 |
|------|------|
| 🤖 AI 流水线 | 多模型生成、审核工作流、质量评分 |
| 🔍 混合搜索 | Meilisearch + 语义向量搜索 |
| 📈 SEO 引擎 | Sitemap、JSON-LD、对比页、内链系统 |
| 🌍 多语言支持 | 10+ 语言 i18n、hreflang、区域 SEO |
| 🔌 开放生态 | Public API v1、MCP、Webhooks、Plugin Framework |
| 🛡️ 生产就绪 | 监控、备份、CI/CD、安全加固 |

### 1.3 技术栈

| 层次 | 技术 |
|------|------|
| 语言 | TypeScript、Node.js 20+ |
| 构建工具 | Turborepo、pnpm |
| 前端 | Next.js 15、Tailwind CSS |
| 后端 | NestJS |
| ORM | Prisma |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 搜索 | Meilisearch |
| 对象存储 | MinIO |
| 消息队列 | BullMQ |
| 邮件 | Mailpit |

---

## 2. 整体架构

### 2.1 架构图

```
                    ┌──────────────────────────────────────┐
                    │          AI Tool Platform             │
                    │           Database (PostgreSQL)       │
                    └──────────────────┬───────────────────┘
                                       │
         ┌───────────────┬─────────────┼─────────────┬───────────────┐
         ▼               ▼             ▼             ▼               ▼
    ┌─────────┐   ┌─────────────┐ ┌─────────┐ ┌──────────┐   ┌──────────┐
    │ Website │   │ REST API v1 │ │ MCP     │ │ Webhook  │   │ SDK      │
    │ (Next.js)│   │ (NestJS)    │ │ Server  │ │ Hub      │   │          │
    └─────────┘   └─────────────┘ └─────────┘ └──────────┘   └──────────┘
         │               │             │             │               │
         └───────────────┼─────────────┼─────────────┼───────────────┘
                         ▼             ▼             ▼
                  ┌───────────┐ ┌───────────┐ ┌───────────┐
                  │  Workers  │ │ Scheduler │ │  Admin   │
                  │ (BullMQ)  │ │ (Cron)    │ │ (Next.js)│
                  └───────────┘ └───────────┘ └───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Crawler  │   │ AI       │   │ SEO      │
    │ Pipeline │   │ Pipeline │   │ Pipeline │
    └──────────┘   └──────────┘   └──────────┘
```

### 2.2 模块划分

项目采用 **Turborepo Monorepo** 结构，分为以下几类：

| 目录 | 说明 |
|------|------|
| `apps/` | 独立运行的应用服务 |
| `packages/` | 共享的可复用包 |
| `prisma/` | 数据库 schema 和迁移 |
| `scripts/` | 运维脚本和工具 |
| `docs/` | 项目文档 |

---

## 3. 主要应用模块

### 3.1 Web (public website)

**路径**: [apps/web](file:///f:/project/ai-tool-cms/apps/web)

| 文件 | 说明 |
|------|------|
| `src/app/layout.tsx` | 根布局，集成 Google Analytics |
| `src/app/[locale]/page.tsx` | 多语言主页 |
| `src/i18n/` | 国际化路由和请求处理 |
| `src/lib/catalog.ts` | 工具目录数据获取 |
| `src/lib/seo.ts` | SEO 元数据生成 |
| `src/lib/tool-page.ts` | 工具详情页数据 |

**端口**: 3000

### 3.2 Admin (admin console)

**路径**: [apps/admin](file:///f:/project/ai-tool-cms/apps/admin)

| 文件 | 说明 |
|------|------|
| `src/app/admin/page.tsx` | 管理页面入口 |
| `src/app/login/page.tsx` | 登录页面 |
| `src/lib/api.ts` | API 客户端封装 |
| `src/lib/rbac.ts` | 角色权限控制 |
| `src/lib/tool-import.ts` | 工具导入功能 |

**端口**: 3001

### 3.3 API (REST API service)

**路径**: [apps/api](file:///f:/project/ai-tool-cms/apps/api)

**核心文件**:

| 文件 | 说明 |
|------|------|
| `src/main.ts` | 应用入口，配置 CORS、安全头、Swagger |
| `src/app.module.ts` | 模块注册中心 |
| `src/prisma/prisma.service.ts` | Prisma 数据库连接 |

**API 模块**:

| 模块 | 说明 |
|------|------|
| `auth/` | 认证与登录 |
| `tools/` | 工具 CRUD |
| `categories/` | 分类管理 |
| `tags/` | 标签管理 |
| `ai/` | AI 生成服务 |
| `seo/` | SEO 管理 |
| `search/` | 搜索服务 |
| `crawler/` | 爬虫管理 |
| `i18n/` | 国际化 |
| `rbac/` | 角色权限 |
| `public-api/` | 公开 API |
| `webhook-hub/` | Webhook 管理 |

**端口**: 4000

### 3.4 Worker (background workers)

**路径**: [apps/worker](file:///f:/project/ai-tool-cms/apps/worker)

**核心文件**:

| 文件 | 说明 |
|------|------|
| `src/main.ts` | Worker 入口，注册所有 worker |
| `src/ai-pipeline.ts` | AI 生成流水线 |
| `src/growth-worker.ts` | 增长引擎 |
| `src/search-index-worker.ts` | 搜索索引 |
| `src/platform-worker.ts` | 平台任务 |
| `src/automation-worker.ts` | 自动化任务 |
| `src/translation-worker.ts` | 翻译任务 |

**Worker 类型**:

| Worker | 职责 |
|--------|------|
| Crawl Workers | 数据源爬取 |
| AI Pipeline | AI 内容生成 |
| Growth Worker | SEO 增长 |
| Search Index | 搜索索引更新 |
| Platform Workers | 平台维护 |
| I18n Workers | 翻译任务 |
| Automation Workers | 自动化任务 |

### 3.5 Scheduler (scheduled jobs)

**路径**: [apps/scheduler](file:///f:/project/ai-tool-cms/apps/scheduler)

定时任务调度器，基于 Cron 表达式调度周期性任务。

---

## 4. 共享包模块

### 4.1 核心基础包

| 包名 | 路径 | 说明 |
|------|------|------|
| `types` | [packages/types](file:///f:/project/ai-tool-cms/packages/types) | 共享类型定义 |
| `common` | [packages/common](file:///f:/project/ai-tool-cms/packages/common) | 通用工具函数 |
| `config` | [packages/config](file:///f:/project/ai-tool-cms/packages/config) | 配置管理 |
| `database` | [packages/database](file:///f:/project/ai-tool-cms/packages/database) | Prisma 数据库封装 |
| `logger` | [packages/logger](file:///f:/project/ai-tool-cms/packages/logger) | 日志服务 |
| `cache` | [packages/cache](file:///f:/project/ai-tool-cms/packages/cache) | Redis 缓存 |

### 4.2 业务功能包

| 包名 | 路径 | 说明 |
|------|------|------|
| `ai` | [packages/ai](file:///f:/project/ai-tool-cms/packages/ai) | AI 模型抽象层 |
| `search` | [packages/search](file:///f:/project/ai-tool-cms/packages/search) | 搜索服务 |
| `seo` | [packages/seo](file:///f:/project/ai-tool-cms/packages/seo) | SEO 工具集 |
| `auth` | [packages/auth](file:///f:/project/ai-tool-cms/packages/auth) | 认证与权限 |
| `queue` | [packages/queue](file:///f:/project/ai-tool-cms/packages/queue) | BullMQ 队列 |
| `crawler-core` | [packages/crawler-core](file:///f:/project/ai-tool-cms/packages/crawler-core) | 爬虫核心 |
| `automation` | [packages/automation](file:///f:/project/ai-tool-cms/packages/automation) | 自动化任务 |
| `i18n` | [packages/i18n](file:///f:/project/ai-tool-cms/packages/i18n) | 国际化 |
| `growth` | [packages/growth](file:///f:/project/ai-tool-cms/packages/growth) | 增长引擎 |

### 4.3 商业化包

| 包名 | 路径 | 说明 |
|------|------|------|
| `affiliate` | [packages/affiliate](file:///f:/project/ai-tool-cms/packages/affiliate) | 联盟营销 |
| `ads` | [packages/ads](file:///f:/project/ai-tool-cms/packages/ads) | 广告管理 |
| `email` | [packages/email](file:///f:/project/ai-tool-cms/packages/email) | 邮件服务 |

### 4.4 基础设施包

| 包名 | 路径 | 说明 |
|------|------|------|
| `monitoring` | [packages/monitoring](file:///f:/project/ai-tool-cms/packages/monitoring) | 监控与可观测性 |
| `observability` | [packages/observability](file:///f:/project/ai-tool-cms/packages/observability) | OpenTelemetry |
| `plugins` | [packages/plugins](file:///f:/project/ai-tool-cms/packages/plugins) | 插件框架 |
| `api-platform` | [packages/api-platform](file:///f:/project/ai-tool-cms/packages/api-platform) | API 平台服务 |
| `mcp-server` | [packages/mcp-server](file:///f:/project/ai-tool-cms/packages/mcp-server) | MCP 服务器 |
| `sdk` | [packages/sdk](file:///f:/project/ai-tool-cms/packages/sdk) | TypeScript SDK |
| `workflow` | [packages/workflow](file:///f:/project/ai-tool-cms/packages/workflow) | 工作流引擎 |

---

## 5. 数据库模型

### 5.1 模型分类

**核心业务模型**:

| 模型 | 说明 |
|------|------|
| `Tool` | AI 工具目录条目（核心） |
| `Category` | 分类（层级结构） |
| `Tag` | 标签（扁平结构） |
| `PricingPlan` | 定价方案 |
| `Review` | 用户评价 |
| `Faq` | 常见问题 |
| `Prompt` | 提示词模板 |

**用户与权限模型**:

| 模型 | 说明 |
|------|------|
| `User` | 用户账户 |
| `Role` | 角色 |
| `Permission` | 权限 |
| `UserRole` | 用户-角色关联 |
| `RolePermission` | 角色-权限关联 |
| `ApiKey` | API 密钥 |

**爬虫模型**:

| 模型 | 说明 |
|------|------|
| `CrawlSource` | 爬虫数据源 |
| `CrawlJob` | 爬取任务 |
| `CrawlRule` | 爬取规则 |
| `CrawlFieldDefine` | 字段定义 |
| `CrawlRecord` | 爬取记录 |

**AI 流水线模型**:

| 模型 | 说明 |
|------|------|
| `AiGenerationTask` | AI 生成任务 |
| `ContentRevision` | 内容修订（待审核） |

**SEO 模型**:

| 模型 | 说明 |
|------|------|
| `SeoMetadata` | SEO 元数据 |
| `SeoComparePage` | 对比页面 |
| `InternalLink` | 内链 |

**搜索模型**:

| 模型 | 说明 |
|------|------|
| `SearchQueryLog` | 搜索查询日志 |
| `SearchClickLog` | 搜索点击日志 |
| `ToolPopularitySnapshot` | 工具流行度快照 |

**商业化模型**:

| 模型 | 说明 |
|------|------|
| `AffiliateProgram` | 联盟计划 |
| `AffiliateLink` | 联盟链接 |
| `SponsoredPlacement` | 赞助位置 |
| `AdSlot` | 广告位 |

### 5.2 核心模型关系图

```
User ──┬── UserRole ── Role ── RolePermission ── Permission
       ├── ApiKey
       ├── Review ── ReviewVote
       ├── Favorite ── Tool
       └── Collection ── CollectionItem ── Tool

Tool ──┬── ToolCategory ── Category
       ├── ToolTag ── Tag
       ├── PricingPlan
       ├── ToolVersion
       ├── Review
       ├── Faq
       ├── Prompt
       ├── SeoMetadata
       ├── CrawlRecord
       ├── AiGenerationTask ── ContentRevision
       ├── InternalLink
       ├── AffiliateLink
       └── ToolTranslation
```

---

## 6. 关键类与函数

### 6.1 AI 模块

#### AIFactory

**路径**: [packages/ai/src/AIFactory.ts](file:///f:/project/ai-tool-cms/packages/ai/src/AIFactory.ts)

```typescript
class AIFactory {
  static create(id: ProviderId, options?: AIFactoryOptions): AIProvider
  static createDefault(options?: AIFactoryOptions): AIProvider
  static registerAll(registry, options?: AIFactoryOptions): void
}
```

**说明**: AI 提供商工厂，支持 OpenAI、Gemini、Claude、DeepSeek 和 Mock 五种提供商。通过工厂模式实现多模型切换。

**支持的提供商**:

| ProviderId | 说明 |
|------------|------|
| `openai` | OpenAI API |
| `gemini` | Google Gemini |
| `claude` | Anthropic Claude |
| `deepseek` | DeepSeek |
| `mock` | 模拟提供商 |

### 6.2 搜索模块

#### SearchService

**路径**: [packages/search/src/search-service.ts](file:///f:/project/ai-tool-cms/packages/search/src/search-service.ts)

```typescript
class SearchService {
  constructor(prisma: PrismaClient)
  async search(input: SearchQuery): Promise<SearchResult>
}
```

**说明**: 混合搜索服务，结合 Meilisearch 全文搜索和语义向量重排序。

**搜索流程**:
1. 关键词标准化和同义词扩展
2. Meilisearch 全文搜索
3. 如果启用语义搜索，计算查询向量并重新排序
4. 构建 facets 聚合
5. 记录搜索日志

### 6.3 爬虫模块

#### BaseCrawler

**路径**: [packages/crawler-core/src/Crawler.ts](file:///f:/project/ai-tool-cms/packages/crawler-core/src/Crawler.ts)

```typescript
abstract class BaseCrawler {
  readonly sourceId: string
  readonly displayName: string
  async crawl(cursor?: CrawlCursor): Promise<CrawlRunResult>
  register(): this
}
```

**说明**: 爬虫基类，支持多种数据源（Toolify、Futurepedia、OpenTools 等）。

**使用示例**:
```typescript
class ToolifyCrawler extends BaseCrawler {
  constructor(fetch: HttpFetcher) {
    super({
      adapter: new ToolifyAdapter(),
      contextOptions: { fetch, sourceId: "toolify" },
    });
  }
}
```

#### CrawlerBuilder

```typescript
class CrawlerBuilder {
  withAdapter(adapter: CrawlerAdapter): this
  withContext(options: CrawlerContextOptions): this
  withPipeline(options: PipelineOptions): this
  build(): ConfiguredCrawler
}
```

### 6.4 队列模块

#### Queue 管理

**路径**: [packages/queue/src/queues.ts](file:///f:/project/ai-tool-cms/packages/queue/src/queues.ts)

**队列类型**:

| 队列类别 | 说明 |
|----------|------|
| Crawl Queues | 爬虫任务 |
| AI Queues | AI 生成任务 |
| Growth Queues | 增长任务 |
| Search Queues | 搜索索引任务 |
| Platform Queues | 平台任务 |
| I18n Queues | 翻译任务 |
| Automation Queues | 自动化任务 |

**核心函数**:

```typescript
getCrawlQueue(name: CrawlQueueName): Queue
getAiQueue(name: AiQueueName): Queue
getGrowthQueue(name: GrowthQueueName): Queue
getSearchQueue(name: SearchQueueName): Queue
getPlatformQueue(name: PlatformQueueName): Queue
getI18nQueue(name: I18nQueueName): Queue
getAutomationQueue(name: AutomationQueueName): Queue
closeAllQueues(): Promise<void>
```

### 6.5 认证与权限模块

#### RBAC 工具函数

**路径**: [packages/auth/src/rbac.ts](file:///f:/project/ai-tool-cms/packages/auth/src/rbac.ts)

```typescript
function flattenPermissions(roles: AuthRole[]): AuthPermission[]
function hasRole(user: Pick<AuthUser, "roles">, roleCode: string): boolean
function hasPermission(user: Pick<AuthUser, "permissions">, permissionCode: string): boolean
function hasAnyPermission(user: Pick<AuthUser, "permissions">, permissionCodes: string[]): boolean
```

### 6.6 SEO 模块

**路径**: [packages/seo/src/index.ts](file:///f:/project/ai-tool-cms/packages/seo/src/index.ts)

**导出功能**:

| 功能 | 说明 |
|------|------|
| `buildMetadata` / `buildToolMetadata` | 构建 SEO 元数据 |
| `buildBreadcrumbJsonLd` | 面包屑 JSON-LD |
| `buildSoftwareApplicationJsonLd` | 软件应用 JSON-LD |
| `buildSitemapEntries` / `buildSitemapXml` | Sitemap 生成 |
| `buildRobots` | Robots.txt 生成 |
| `buildRssFeed` / `buildAtomFeed` | Feed 生成 |
| `scoreSeoHealth` | SEO 健康评分 |
| `syncInternalLinks` | 内链同步 |

### 6.7 自动化模块

**包名**: `@ai-tool-cms/automation`
**入口**: [packages/automation/src/index.ts](file:///f:/project/ai-tool-cms/packages/automation/src/index.ts)
**描述**: 自主平台模块 — 网站监控、AI 内容刷新、社交发帖、搜索引擎收录（Commit 082–090）

#### 6.7.1 模块结构

| 源文件 | 职责 |
|--------|------|
| [enqueue.ts](file:///f:/project/ai-tool-cms/packages/automation/src/enqueue.ts) | 队列入队封装（8 个 enqueue 函数） |
| [scheduler.ts](file:///f:/project/ai-tool-cms/packages/automation/src/scheduler.ts) | 自动化调度入口（bootstrap、daily、weekly） |
| [dashboard.ts](file:///f:/project/ai-tool-cms/packages/automation/src/dashboard.ts) | 中心仪表盘指标聚合 |
| [ai-refresh.ts](file:///f:/project/ai-tool-cms/packages/automation/src/ai-refresh.ts) | AI 内容定时刷新 |
| [website-monitor.ts](file:///f:/project/ai-tool-cms/packages/automation/src/website-monitor.ts) | 网站内容变更监控 |
| [price-monitor.ts](file:///f:/project/ai-tool-cms/packages/automation/src/price-monitor.ts) | 价格变更监控 |
| [link-check.ts](file:///f:/project/ai-tool-cms/packages/automation/src/link-check.ts) | 失效链接检查 |
| [social.ts](file:///f:/project/ai-tool-cms/packages/automation/src/social.ts) | 社交媒体自动发帖 |
| [tool-logo.ts](file:///f:/project/ai-tool-cms/packages/automation/src/tool-logo.ts) | 工具 Logo 自动收集 |
| [index-submit.ts](file:///f:/project/ai-tool-cms/packages/automation/src/index-submit.ts) | 搜索引擎收录提交 |
| [newsletter-auto.ts](file:///f:/project/ai-tool-cms/packages/automation/src/newsletter-auto.ts) | 新闻通讯自动调度 |

#### 6.7.2 队列定义

自动化模块使用 10 个 BullMQ 队列，定义于 [packages/queue/src/automation-types.ts](file:///f:/project/ai-tool-cms/packages/queue/src/automation-types.ts)：

| 队列名称 | Job Payload | 说明 |
|----------|-------------|------|
| `automation-discovery-run` | `{ taskId: string }` | 发现源任务 |
| `automation-website-monitor` | `{ monitorId: string }` | 网站监控 |
| `automation-price-monitor` | `{ monitorId: string }` | 价格监控 |
| `automation-screenshot-capture` | `{ toolId, variants? }` | 截图采集 |
| `automation-tool-logo-collect` | `{ toolId, force? }` | Logo 收集 |
| `automation-link-check` | `{ targetType, targetId, url }` | 链接检查 |
| `automation-ai-refresh` | `{ scheduleId, toolId }` | AI 刷新 |
| `automation-social-post` | `{ postId }` | 社交发帖 |
| `automation-newsletter-auto` | `{ campaignType, categoryId? }` | 新闻通讯 |
| `automation-index-submit` | `{ submissionId, url, provider }` | 搜索引擎收录 |

队列默认配置：`removeOnComplete: 200`、`removeOnFail: 500`、`attempts: 3`、指数退避 `delay: 5000ms`。

#### 6.7.3 入队函数（enqueue.ts）

所有函数为 `async`，返回 `Promise<string>`（BullMQ Job ID）：

```typescript
// 网站监控入队
async function enqueueWebsiteMonitor(monitorId: string): Promise<string>

// Logo 收集入队（force=true 强制重新收集）
async function enqueueToolLogoCollect(toolId: string, force?: boolean): Promise<string>

// 价格监控入队
async function enqueuePriceMonitor(monitorId: string): Promise<string>

// 失效链接检查入队
async function enqueueLinkCheck(targetType: string, targetId: string, url: string): Promise<string>

// AI 内容刷新入队
async function enqueueAiRefresh(scheduleId: string, toolId: string): Promise<string>

// 社交发帖入队
async function enqueueSocialPost(postId: string): Promise<string>

// 新闻通讯入队
async function enqueueNewsletterAuto(campaignType: string, categoryId?: string): Promise<string>

// 搜索引擎收录入队（provider: "GOOGLE" | "BING"）
async function enqueueIndexSubmit(submissionId: string, url: string, provider: "GOOGLE" | "BING"): Promise<string>
```

#### 6.7.4 调度入口（scheduler.ts）

```typescript
// 启动自动化：并行初始化发现源、网站监控、价格监控、AI 刷新计划
async function bootstrapAutomation(prisma: PrismaClient): Promise<Record<string, number>>

// 日级轮询：执行 7 个子流程（发现源→网站监控→价格监控→链接检查→AI 刷新→社交发帖→搜索引擎收录）
async function runDailyAutomationPoll(prisma: PrismaClient): Promise<Record<string, number>>

// 周级轮询：调度每周新闻通讯和分类新闻通讯
async function runWeeklyAutomationPoll(prisma: PrismaClient): Promise<{ newsletters: number }>
```

**`runDailyAutomationPoll` 执行流程**:
1. `pollDueDiscoverySources` → 发现到期源，为每个 taskId 调用 `enqueueDiscoveryRun`
2. `pollWebsiteMonitors` → 取 20 条 24h 未检查的监控器，入队
3. `pollPriceMonitors` → 取 20 条 24h 未检查的价格监控器，入队
4. `auditPublishedToolLinks` → 取 50 条已发布工具，为每个 website 入队链接检查
5. `pollDueAiRefresh` → 取 10 条到期 AI 刷新计划，入队
6. `generateSocialPosts` → 生成社交帖子并入队
7. `indexPublishedTools` → 取 20 条最新发布工具，入队搜索引擎收录

#### 6.7.5 AI 内容刷新（ai-refresh.ts）

**配置**: `DEFAULT_INTERVAL_DAYS = Number(process.env.AUTOMATION_AI_REFRESH_DAYS ?? 30)`

```typescript
// 执行 AI 刷新：启动 AI 流水线重新生成内容，更新 schedule 的 lastRefreshedAt 和 nextDueAt
async function runAiRefresh(
  prisma: PrismaClient,
  scheduleId: string,
  toolId: string,
): Promise<{ pipelineRunId: string }>

// 为已发布工具创建 AI 刷新计划（最多 500 条）
async function ensureAiRefreshSchedules(prisma: PrismaClient): Promise<number>

// 查询到期的 AI 刷新计划（最多 10 条）
async function pollDueAiRefresh(prisma: PrismaClient): Promise<Array<{ scheduleId: string; toolId: string }>>
```

**`runAiRefresh` 核心逻辑**:
1. 查询 `aiRefreshSchedule`（验证 `isEnabled: true`）
2. 调用 `startAiPipeline(toolId, callback)` 启动 AI 流水线
3. 回调通过 `enqueueAiJob` 将子任务分发到 AI 队列
4. 更新 schedule：`lastRefreshedAt = now`、`nextDueAt = now + intervalDays * 86400000`
5. 返回 `{ pipelineRunId }`

#### 6.7.6 网站监控（website-monitor.ts）

```typescript
// 检查网站内容变更：拉取页面→计算 SHA-256 哈希→与历史对比
async function checkWebsiteMonitor(
  prisma: PrismaClient,
  monitorId: string,
): Promise<{ changed: boolean }>

// 为已发布工具创建网站监控（最多 500 条）
async function ensureWebsiteMonitorsForPublishedTools(prisma: PrismaClient): Promise<number>

// 查询 24h 未检查的 ACTIVE 监控器（最多 20 条）
async function pollWebsiteMonitors(prisma: PrismaClient): Promise<string[]>
```

**`checkWebsiteMonitor` 变更检测流程**:
1. `fetch(url)` 拉取页面（UA: `ai-tool-cms-website-monitor/1.0`）
2. 取正文前 50,000 字符计算 `contentHash`（SHA-256）
3. 哈希变化时：
   - 创建 `websiteMonitorEvent`（`changeType: "CONTENT_CHANGED"`）
   - 更新 monitor 的 `contentHash`、`etag`、`lastChangedAt`
   - 触发重新采集：创建 `crawlJob` 并入队 + 启动 `startAiPipeline`
4. 无变化时：仅更新 `lastCheckedAt`

#### 6.7.7 价格监控（price-monitor.ts）

```typescript
// 检查价格变更：拉取定价页→正则提取价格信号→哈希对比
async function checkPriceMonitor(
  prisma: PrismaClient,
  monitorId: string,
): Promise<{ changed: boolean }>

// 为已发布工具创建价格监控（推导 pricingUrl 为 ${website}pricing）
async function ensurePriceMonitorsForPublishedTools(prisma: PrismaClient): Promise<number>

// 查询 24h 未检查的 ACTIVE 价格监控器
async function pollPriceMonitors(prisma: PrismaClient): Promise<string[]>
```

**`extractPricingSignals(html)` 提取逻辑**:
- 正则 `/\$\s?\d+(?:\.\d{2})?/g` 提取价格
- 匹配关键词：`free`、`pro`、`plus`、`enterprise`、`team`、`business`
- 返回 `{ prices, plans, hash }`

#### 6.7.8 失效链接检查（link-check.ts）

```typescript
type LinkCheckResult = {
  isHealthy: boolean;
  httpStatus?: number;
  issues: Array<{ issueType: BrokenLinkIssueType; message: string }>;
};

// 检查 URL 健康度（15 秒超时，支持 HTTPS/HTTP）
async function checkUrlHealth(url: string): Promise<LinkCheckResult>

// 执行链接检查并写入 brokenLinkCheck + brokenLinkIssue 记录
async function runLinkCheck(
  prisma: PrismaClient,
  targetType: string,
  targetId: string,
  url: string,
): Promise<LinkCheckResult>

// 审计已发布工具链接（取 50 条 PUBLISHED 工具）
async function auditPublishedToolLinks(prisma: PrismaClient): Promise<string[]>

// 审计单个工具的所有链接（website + 最多 20 条 affiliateLink）
async function auditToolLinks(prisma: PrismaClient, toolId: string): Promise<number>
```

**问题分类**:
| issueType | 触发条件 |
|-----------|----------|
| `HTTP_ERROR` | HTTP 状态码 >= 400 |
| `TIMEOUT` | 请求超过 15 秒 |
| `SSL_ERROR` | SSL 证书错误 |
| `DNS_ERROR` | DNS 解析失败 |
| `REDIRECT_LOOP` | 重定向次数 > 5 |
| `OTHER` | 非 HTTP(S) 协议 |

#### 6.7.9 社交发帖（social.ts）

```typescript
type SocialPostTemplate = "NEW_AI" | "TRENDING_AI" | "WEEKLY_AI" | "TOP_AI";

// 生成社交帖子文案
function buildSocialPostContent(template: SocialPostTemplate, tools: Tool[]): string

// 为 5 个平台生成社交帖子（X、LinkedIn、Bluesky、Threads、Mastodon）
async function generateSocialPosts(
  prisma: PrismaClient,
  template: SocialPostTemplate,
): Promise<string[]>

// 发布社交帖子到目标平台
async function publishSocialPost(prisma: PrismaClient, postId: string): Promise<void>
```

**`publishSocialPost` 发布逻辑**:
1. 查询 `socialPost`
2. 调用 `publishToPlatform(platform, content)`
   - 平台未启用（`SOCIAL_{platform}_ENABLED != true`）→ 返回 mock ID
   - 缺 token → 抛错
3. 成功 → 更新 `status: PUBLISHED`、`publishedAt`、`externalId`
4. 失败 → 更新 `status: FAILED`、`errorMessage`，re-throw

**支持平台**:

| 平台 | 环境变量 |
|------|----------|
| X (Twitter) | `SOCIAL_X_ENABLED`、`SOCIAL_X_TOKEN` |
| LinkedIn | `SOCIAL_LINKEDIN_ENABLED`、`SOCIAL_LINKEDIN_TOKEN` |
| Bluesky | `SOCIAL_BLUESKY_ENABLED`、`SOCIAL_BLUESKY_TOKEN` |
| Threads | `SOCIAL_THREADS_ENABLED`、`SOCIAL_THREADS_TOKEN` |
| Mastodon | `SOCIAL_MASTODON_ENABLED`、`SOCIAL_MASTODON_TOKEN` |

#### 6.7.10 工具 Logo 收集（tool-logo.ts）

**核心文件**: [packages/automation/src/tool-logo.ts](file:///f:/project/ai-tool-cms/packages/automation/src/tool-logo.ts)（485 行）

```typescript
// 收集工具 Logo：多源发现→验证→存储→更新 tool.logoUrl
async function collectToolLogo(
  prisma: PrismaClient,
  toolId: string,
  options?: { force?: boolean },
): Promise<
  | { ok: true; skipped: boolean; logoUrl: string; source: LogoSource; reason?: string }
  | { ok: false; reason: string }
>

// 预览 Logo 候选（不执行存储）
async function previewToolLogo(
  prisma: PrismaClient,
  toolId: string,
): Promise<{ ok: boolean; candidates: LogoValidationResult[]; recommendedUrl?: string }>
```

**Logo 来源优先级**:

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | `/favicon.ico` | 网站根目录 favicon |
| 1-2 | `<link rel="icon">` | HTML link 标签（SVG 优先级 2） |
| 3 | `/apple-touch-icon.png` | Apple Touch Icon |
| 3 | `/apple-touch-icon-precomposed.png` | Apple Touch Icon（旧版） |
| 4 | SimpleIcons CDN | `https://cdn.simpleicons.org/{slug}` |
| 5 | `og:image` | Open Graph 图片 |
| 6 | `twitter:image` | Twitter 卡片图片 |
| 7 | 可见 Logo `<img>` | HTML 中含 `logo\|brand` 的 img 标签 |

**验证规则**:
- `Content-Type` 以 `image/` 开头
- 文件大小 ≤ 2MB（`MAX_LOGO_BYTES`）
- 最小尺寸 16×16（`MIN_DIMENSION`）
- 非 HTML 响应
- 严格模式超时 12 秒，预览模式 8 秒

**存储**: 文件名为 SHA-256 前 20 字符 + 扩展名，写入 `storage/logos/` 目录。

#### 6.7.11 搜索引擎收录（index-submit.ts）

```typescript
// 提交 URL 到搜索引擎（Google 或 Bing）
async function submitToSearchEngine(
  prisma: PrismaClient,
  submissionId: string,
  url: string,
  provider: "GOOGLE" | "BING",
): Promise<void>

// 为 URL 创建 Google + Bing 两条提交记录
async function enqueueIndexForUrl(prisma: PrismaClient, url: string): Promise<string[]>

// 为 20 条最新发布工具创建收录提交
async function indexPublishedTools(prisma: PrismaClient): Promise<string[]>
```

**搜索引擎提交方式**:
| 搜索引擎 | API | 环境变量 |
|----------|-----|----------|
| Bing | IndexNow API (`https://api.indexnow.org/indexnow`) | `BING_INDEXNOW_KEY` |
| Google | Google Indexing API（需服务账号 JSON） | `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` |

#### 6.7.12 新闻通讯自动调度（newsletter-auto.ts）

```typescript
// 调度每周新闻通讯（WEEKLY_AI、NEW_AI、TOP_AI、TRENDING_AI）
async function scheduleWeeklyNewsletters(prisma: PrismaClient): Promise<string[]>

// 调度分类新闻通讯（取 5 条最新更新的分类）
async function scheduleCategoryNewsletters(prisma: PrismaClient): Promise<string[]>
```

**逻辑**:
1. 调用 `buildNewsletterContent(prisma, type)` 生成邮件内容
2. 创建 `newsletterCampaign`（`status: SCHEDULED`）
3. 入队到 `PLATFORM_QUEUE_NAMES.NEWSLETTER_SEND`（Platform 队列）

#### 6.7.13 中心仪表盘（dashboard.ts）

```typescript
type AutomationCenterMetrics = {
  discovery: DiscoveryDashboardMetrics;
  queues: {
    automation: Record<string, QueueStats>;
    crawl: number;
    ai: Record<string, QueueStats>;
    growth: Record<string, QueueStats>;
    search: Record<string, QueueStats>;
    platform: Record<string, QueueStats>;
    i18n: number;
  };
  monitors: {
    websiteActive: number;
    priceActive: number;
    brokenLinksOpen: number;  // 近 7 天
    aiRefreshDue: number;
    socialScheduled: number;
    indexPending: number;
  };
  recentRuns: Array<{ id: string; kind: string; status: string; createdAt: string; errorMessage: string | null }>;
};

// 聚合 13 个并行查询生成仪表盘指标
async function getAutomationCenterMetrics(prisma: PrismaClient): Promise<AutomationCenterMetrics>

// 创建自动化运行记录
async function createAutomationRun(prisma: PrismaClient, kind: string, referenceId?: string): Promise<AutomationRun>

// 结束自动化运行记录（status: COMPLETED 或 FAILED）
async function finishAutomationRun(
  prisma: PrismaClient,
  runId: string,
  result: Record<string, unknown>,
  error?: string,
): Promise<void>
```

#### 6.7.14 模块依赖关系

```
automation
  ├── @ai-tool-cms/ai          → startAiPipeline（AI 刷新、网站监控变更后触发）
  ├── @ai-tool-cms/config      → getEnv（社交发帖、Logo 收集、搜索引擎收录）
  ├── @ai-tool-cms/database    → PrismaClient + 全部 Prisma 类型
  ├── @ai-tool-cms/discovery   → 发现源轮询/默认初始化（scheduler.ts）
  ├── @ai-tool-cms/email       → buildNewsletterContent（新闻通讯内容生成）
  ├── @ai-tool-cms/queue       → BullMQ 队列管理（所有 enqueue + stats）
  └── @ai-tool-cms/screenshot  → 截图能力（声明依赖，队列已定义）
```

### 6.8 增长引擎模块

**包名**: `@ai-tool-cms/growth`
**入口**: [packages/growth/src/index.ts](file:///f:/project/ai-tool-cms/packages/growth/src/index.ts)

#### runSiteGrowthLoop

**路径**: [packages/growth/src/loop.ts](file:///f:/project/ai-tool-cms/packages/growth/src/loop.ts)

```typescript
async function runSiteGrowthLoop(
  prisma: PrismaClient,
  toolId: string,
  reason: GrowthTriggerReason,
  actorId?: string,
): Promise<GrowthLoopResult>
```

**说明**: 站点增长循环，工具发布后自动执行全链路扩展。

**执行步骤**:
1. 插件 `beforePublish` 钩子
2. 分类标签同步（`syncToolTaxonomyFromNames`）
3. 默认分类保证（`ensureDefaultCategory`）
4. GEO 文档落库（`persistGeoDocumentForTool`）
5. 内部链接同步
6. 对比页同步
7. 插件 `beforeSEO` 钩子
8. 分类 SEO 元数据刷新（`refreshTaxonomySeoMetadata`）
9. `SEO_UPDATED` webhook 触发
10. Sitemap ping
11. 搜索索引入队
12. `TOOL_ADDED` webhook 触发
13. 插件 `afterPublish` 钩子
14. 多语言翻译入队

#### enqueueSiteGrowth

```typescript
async function enqueueSiteGrowth(
  toolId: string,
  reason: GrowthTriggerReason,
  actorId?: string,
): Promise<string>
```

**说明**: 将增长循环任务入队到 `GROWTH_QUEUE_NAMES.TOOL_PUBLISHED` 队列，与 AI PUBLISH worker 解耦。

#### 分类/标签管理函数

| 函数 | 路径 | 说明 |
|------|------|------|
| `persistCrawlCategories` | [taxonomy.ts](file:///f:/project/ai-tool-cms/packages/growth/src/taxonomy.ts) | 按 slug 持久化抓取到的分类 |
| `syncToolTaxonomyFromNames` | taxonomy.ts | 将分类/标签名同步到工具（首个分类标记 `isPrimary`） |
| `ensureDefaultCategory` | taxonomy.ts | 保证已发布工具至少有一个分类 |
| `refreshTaxonomySeoMetadata` | taxonomy.ts | 刷新分类/标签的 SEO 元数据（生成 `Best {name} AI Tools (N)` 标题） |
| `persistGeoDocumentForTool` | [geo-persist.ts](file:///f:/project/ai-tool-cms/packages/growth/src/geo-persist.ts) | 为 LLM 爬虫物化 GEO 文档 |

### 6.9 发现源模块

**包名**: `@ai-tool-cms/discovery`
**入口**: [packages/discovery/src/index.ts](file:///f:/project/ai-tool-cms/packages/discovery/src/index.ts)

#### 核心函数

| 函数 | 路径 | 说明 |
|------|------|------|
| `ensureDefaultDiscoverySources` | [engine.ts](file:///f:/project/ai-tool-cms/packages/discovery/src/engine.ts) | 初始化 9 个内置发现源 |
| `pollDueDiscoverySources` | engine.ts | 轮询到期源（最多 10 条），创建 `PENDING` 任务 |
| `runDiscoveryTask` | engine.ts | 执行发现任务：匹配适配器→获取候选→去重→写入结果 |
| `getDiscoveryDashboard` | [dashboard.ts](file:///f:/project/ai-tool-cms/packages/discovery/src/dashboard.ts) | 聚合发现源仪表盘指标 |
| `enqueueDiscoveryRun` | [enqueue.ts](file:///f:/project/ai-tool-cms/packages/discovery/src/enqueue.ts) | 将发现任务入队 |

#### 内置发现源适配器（9 个）

| 适配器 | 来源 |
|--------|------|
| `hackerNewsAdapter` | Hacker News AI |
| `githubTrendingAdapter` | GitHub Trending |
| `redditAiAdapter` | Reddit ML |
| `huggingFaceAdapter` | HuggingFace Papers |
| `productHuntAdapter` | Product Hunt |
| `googleNewsAdapter` | Google News AI |
| `rssFeedAdapter` | AI Tools RSS |
| `officialBlogAdapter` | OpenAI Blog |
| `xAiAdapter` | X AI Trending |

### 6.10 缓存模块

**包名**: `@ai-tool-cms/cache`
**入口**: [packages/cache/src/index.ts](file:///f:/project/ai-tool-cms/packages/cache/src/index.ts)

```typescript
// Cache-aside 模式核心函数
function cacheKey(parts: string[], prefix?: string): string  // 生成缓存 key（超 200 字符自动 SHA-256 短哈希）
async function cacheGet<T>(key: string): Promise<T | null>   // 读缓存（JSON 解析）
async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void>  // 写缓存（默认 60s TTL）
async function cacheDel(key: string): Promise<void>          // 删缓存

// 高阶缓存包装器：先查缓存，未命中调 loader 取值并回写
async function withCache<T>(key: string, loader: () => Promise<T>, options?: CacheOptions): Promise<T>

// Redis 连接管理
async function getRedisClient(): Promise<RedisClient | null>  // 懒加载单例（REDIS_URL 未配置返回 null）
async function redisPing(): Promise<boolean>                  // 健康检查
```

**路径**: [packages/cache/src/cache-aside.ts](file:///f:/project/ai-tool-cms/packages/cache/src/cache-aside.ts) | [redis.ts](file:///f:/project/ai-tool-cms/packages/cache/src/redis.ts)

### 6.11 邮件模块

**包名**: `@ai-tool-cms/email`
**入口**: [packages/email/src/index.ts](file:///f:/project/ai-tool-cms/packages/email/src/index.ts)

| 函数 | 路径 | 说明 |
|------|------|------|
| `sendEmail` | [transport.ts](file:///f:/project/ai-tool-cms/packages/email/src/transport.ts) | 底层邮件发送（nodemailer SMTP） |
| `renderTemplate` | [automation.ts](file:///f:/project/ai-tool-cms/packages/email/src/automation.ts) | 渲染邮件模板（`{{key}}` 变量替换） |
| `sendTemplatedEmail` | automation.ts | 渲染+发送+记录日志 |
| `buildNewsletterContent` | [newsletter.ts](file:///f:/project/ai-tool-cms/packages/email/src/newsletter.ts) | 按类型聚合 7 天内工具生成邮件内容 |
| `getConfirmedSubscribers` | newsletter.ts | 获取已确认订阅者列表 |

### 6.12 国际化模块

**包名**: `@ai-tool-cms/i18n`
**入口**: [packages/i18n/src/index.ts](file:///f:/project/ai-tool-cms/packages/i18n/src/index.ts)

**支持语言**: `en`、`zh-CN`、`zh-TW`、`ja`、`ko`、`es`、`de`、`fr`、`pt-BR`、`ru`（10 种）

| 函数 | 路径 | 说明 |
|------|------|------|
| `resolveLocalizedTool` | [resolve.ts](file:///f:/project/ai-tool-cms/packages/i18n/src/resolve.ts) | 按 locale fallback 链解析工具内容 |
| `buildFallbackChain` | resolve.ts | 构建回退链 `[locale, DEFAULT_LOCALE]` |
| `buildHreflangAlternates` | [regional-seo.ts](file:///f:/project/ai-tool-cms/packages/i18n/src/regional-seo.ts) | 生成 hreflang 备用链接 |
| `buildHreflangMap` | regional-seo.ts | 生成完整 URL hreflang 映射（含 `x-default`） |
| `generateLocaleContent` | [workflow.ts](file:///f:/project/ai-tool-cms/packages/i18n/src/workflow.ts) | 每语言 AI 风格内容生成（非机翻） |
| `runTranslationWorkflow` | workflow.ts | 执行翻译工作流（RUNNING→AI_GENERATE→SEO→PUBLISH） |
| `enqueueTranslationWorkflow` | [enqueue.ts](file:///f:/project/ai-tool-cms/packages/i18n/src/enqueue.ts) | 创建翻译任务并入队 |
| `getGlobalDashboardMetrics` | [global-dashboard.ts](file:///f:/project/ai-tool-cms/packages/i18n/src/global-dashboard.ts) | 全球化仪表盘指标 |

### 6.13 截图模块

**包名**: `@ai-tool-cms/screenshot`
**入口**: [packages/screenshot/src/index.ts](file:///f:/project/ai-tool-cms/packages/screenshot/src/index.ts)

```typescript
// 截取单张截图（Playwright 无头浏览器）
async function captureScreenshot(options: CaptureOptions): Promise<CaptureResult>

// 批量截取工具网站多尺寸截图（DESKTOP/MOBILE/DARK）
async function captureToolScreenshots(
  prisma: PrismaClient,
  toolId: string,
  variants?: ScreenshotVariant[],
): Promise<number>

// 截图任务入队
async function enqueueScreenshotCapture(
  toolId: string,
  variants?: Array<"DESKTOP" | "MOBILE" | "DARK">,
): Promise<string>
```

**路径**: [packages/screenshot/src/capture.ts](file:///f:/project/ai-tool-cms/packages/screenshot/src/capture.ts)

**视口配置**:

| 变体 | 分辨率 | 特殊 |
|------|--------|------|
| DESKTOP | 1280×720 | - |
| MOBILE | 390×844 | - |
| DARK | 1280×720 | `colorScheme: "dark"` |

Playwright 失败时回退为 1×1 透明 PNG 占位（`engine: "placeholder"`）。

### 6.14 数据库模块

**包名**: `@ai-tool-cms/database`
**入口**: [packages/database/src/index.ts](file:///f:/project/ai-tool-cms/packages/database/src/index.ts)

```typescript
// Prisma 单例管理
export const prisma: PrismaClient;
export async function connectPrisma(): Promise<void>;
export async function disconnectPrisma(): Promise<void>;
```

**路径**: [packages/database/src/prisma.ts](file:///f:/project/ai-tool-cms/packages/database/src/prisma.ts) | [client.ts](file:///f:/project/ai-tool-cms/packages/database/src/client.ts)

**单例策略**: 通过 `globalThis` 缓存避免开发模式热重载时重复创建连接。

**导出枚举**: `ToolStatus`、`CrawlJobStatus`、`CrawlSourceKind`、`AiPipelineStage`、`ReviewStatus`、`PricingModel`、`AutomationRunStatus` 等 20+ Prisma 枚举类型。

---

## 7. 依赖关系

### 7.1 包依赖关系

```
apps/web ──────────────────────────────────────────────────────────┐
    │                                                              │
    ├── packages/common            ── 通用工具                     │
    ├── packages/config            ── 配置管理                     │
    ├── packages/types             ── 类型定义                     │
    ├── packages/seo               ── SEO 工具                     │
    └── packages/search            ── 搜索服务                     │
                                                                   │
apps/admin ────────────────────────────────────────────────────────┤
    │                                                              │
    ├── packages/auth              ── 认证权限                     │
    ├── packages/common            ── 通用工具                     │
    └── packages/config            ── 配置管理                     │
                                                                   │
apps/api ──────────────────────────────────────────────────────────┤
    │                                                              │
    ├── packages/ai                ── AI 服务                     │
    ├── packages/auth              ── 认证权限                     │
    ├── packages/cache             ── 缓存服务                     │
    ├── packages/common            ── 通用工具                     │
    ├── packages/config            ── 配置管理                     │
    ├── packages/crawler-core      ── 爬虫核心                     │
    ├── packages/database          ── 数据库                      │
    ├── packages/growth            ── 增长引擎                     │
    ├── packages/i18n              ── 国际化                      │
    ├── packages/logger            ── 日志服务                     │
    ├── packages/monitoring        ── 监控服务                     │
    ├── packages/plugins           ── 插件框架                     │
    ├── packages/queue             ── 队列服务                     │
    ├── packages/search            ── 搜索服务                     │
    ├── packages/seo               ── SEO 工具                     │
    └── packages/types             ── 类型定义                     │
                                                                   │
apps/worker ───────────────────────────────────────────────────────┤
    │                                                              │
    ├── packages/ai                ── AI 服务                     │
    ├── packages/automation        ── 自动化                      │
    ├── packages/crawler-core      ── 爬虫核心                     │
    ├── packages/database          ── 数据库                      │
    ├── packages/growth            ── 增长引擎                     │
    ├── packages/i18n              ── 国际化                      │
    ├── packages/logger            ── 日志服务                     │
    ├── packages/monitoring        ── 监控服务                     │
    ├── packages/plugins           ── 插件框架                     │
    ├── packages/queue             ── 队列服务                     │
    ├── packages/search            ── 搜索服务                     │
    ├── packages/seo               ── SEO 工具                     │
    └── packages/types             ── 类型定义                     │
                                                                   │
packages/ai ───────────────────────────────────────────────────────┤
    │                                                              │
    ├── packages/config            ── 配置管理                     │
    └── packages/types             ── 类型定义                     │
                                                                   │
packages/search ───────────────────────────────────────────────────┘
    │
    ├── packages/database          ── 数据库
    └── packages/types             ── 类型定义
```

### 7.2 外部服务依赖

| 服务 | 端口 | 用途 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存、队列 |
| Meilisearch | 7700 | 搜索索引 |
| MinIO | 9000/9001 | 对象存储 |
| Mailpit | 8025 | 邮件测试 |
| Nginx | - | 反向代理 |

---

## 8. 项目运行方式

### 8.1 环境准备

**Node.js**: >= 20
**pnpm**: >= 9

### 8.2 安装依赖

```bash
git clone https://github.com/zhshg/ai-tool-cms.git
cd ai-tool-cms
cp .env.example .env
pnpm install --frozen-lockfile
```

### 8.3 启动基础设施

```bash
pnpm docker:up
```

### 8.4 数据库初始化

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
```

### 8.5 启动开发服务

**启动完整栈**:
```bash
pnpm dev:stack
```

**单独启动**:
```bash
pnpm dev:web      # http://localhost:3000
pnpm dev:admin    # http://localhost:3001
pnpm dev:api      # http://localhost:4000
```

### 8.6 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有包 |
| `pnpm lint` | 代码检查 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test:unit` | 单元测试 |
| `pnpm test:e2e` | E2E 测试 |
| `pnpm db:studio` | Prisma Studio |
| `pnpm docker:down` | 停止基础设施 |
| `pnpm mcp` | 启动 MCP 服务器 |

### 8.7 服务访问

| 服务 | URL |
|------|-----|
| Website | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |
| Prisma Studio | http://localhost:5555 |
| Meilisearch | http://localhost:7700 |
| MinIO Console | http://localhost:9001 |
| Mailpit | http://localhost:8025 |

---

## 9. 部署与运维

### 9.1 Docker 部署

**构建镜像**:
```bash
docker build -f docker/Dockerfile -t ai-tool-cms .
```

**运行容器**:
```bash
docker run -p 3000:3000 -p 3001:3001 -p 4000:4000 ai-tool-cms
```

### 9.2 生产环境配置

复制 `.env.production.example` 为 `.env.production`，配置生产环境变量。

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### 9.3 CI/CD

**路径**: [.github/workflows/](file:///f:/project/ai-tool-cms/.github/workflows)

| 文件 | 说明 |
|------|------|
| `ci.yml` | 持续集成，运行 lint、typecheck、test |
| `deploy.yml` | 部署流水线 |

### 9.4 监控与运维

| 脚本 | 说明 |
|------|------|
| `scripts/backup/backup-postgres.sh` | PostgreSQL 备份 |
| `scripts/backup/restore-postgres.sh` | PostgreSQL 恢复 |
| `scripts/ops/reindex-search.mjs` | 重新索引搜索 |
| `scripts/ops/verify-live-seo.py` | 验证 SEO |
| `scripts/ops/fill-missing-logos.mjs` | 补全 Logo |

### 9.5 日志与审计

- API 访问日志记录
- 搜索查询日志（`SearchQueryLog`）
- 审计日志（`AuditLog`）
- API 密钥使用日志（`ApiKeyUsageLog`）

---

## 附录

### A. 项目版本

- **Version**: 1.0.0 GA
- **License**: MIT

### B. 代码规范

- 使用 TypeScript strict 模式
- ESLint + Prettier 代码格式化
- Husky pre-commit hooks
- 遵循 [docs/00-project/CodingStandards.md](file:///f:/project/ai-tool-cms/docs/00-project/CodingStandards.md)

### C. 命名规范

参考 [docs/00-project/NamingConvention.md](file:///f:/project/ai-tool-cms/docs/00-project/NamingConvention.md)

### D. 目录结构

参考 [docs/00-project/FolderStructure.md](file:///f:/project/ai-tool-cms/docs/00-project/FolderStructure.md)