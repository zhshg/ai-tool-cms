# Product Sprint 2 - Category System Audit

## Scope

本次审计仅做现状分析，不修改业务代码。

审计范围覆盖：

- Prisma category model
- seed data
- category APIs
- web category pages
- sitemap
- SEO metadata
- admin category pages

关键参考文件：

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/seeds/taxonomy.ts`
- `prisma/seeds/public-catalog.ts`
- `prisma/seeds/bulk.ts`
- `apps/api/src/categories/*`
- `apps/api/src/public-api/*`
- `apps/api/src/seo/seo.service.ts`
- `packages/public-api/src/handlers.ts`
- `packages/seo/src/compare/index.ts`
- `apps/web/src/app/[locale]/categories/page.tsx`
- `apps/web/src/app/[locale]/category/[slug]/page.tsx`
- `apps/web/src/lib/catalog.ts`
- `apps/web/src/app/sitemap.xml/route.ts`
- `apps/web/src/app/sitemaps/[chunk]/route.ts`
- `apps/admin/src/app/(dashboard)/categories/page.tsx`
- `apps/admin/src/lib/api.ts`

## Executive Summary

当前仓库已经具备一个“可运行但偏基础”的 category system：

- 数据层已有 `Category` 主模型、父子层级、工具关联、基础 SEO 字段。
- seed 已提供 demo taxonomy、public catalog taxonomy、bulk taxonomy。
- API 已同时提供后台 CRUD 和 Public API 查询。
- Web 已有分类聚合页 `/[locale]/categories` 和单分类落地页 `/[locale]/category/[slug]`。
- Sitemap 已能输出 category URL。
- Admin 已有只读列表页。

但如果目标是 production-ready 的 AI Tool Directory，当前 category system 仍有明显缺口：

- taxonomy 仍然偏浅，缺少明确的一级/二级类目策略。
- category 页面内容结构偏轻，缺少可持续增长的 SEO 模块。
- category 数据字段不足以支持编辑治理、内容扩展、国际化展示和程序化 SEO。
- admin 只有查看，没有完整的 taxonomy management workflow。
- public category page 还没有体现排序、筛选、子分类、精选集合、对比入口、可索引内容块等目录站关键能力。

## 1. What category data exists?

当前已存在的 category 相关数据包括：

### 1.1 Core category records

来自 `Category` 模型：

- 基础标识：`id`, `slug`, `name`
- 描述：`description`
- 层级：`parentId`
- 排序：`sortOrder`
- 展示：`iconUrl`
- SEO：`metaTitle`, `metaDescription`
- 扩展：`metadata`
- 审计字段：`createdById`, `updatedById`, `deletedById`, `createdAt`, `updatedAt`, `deletedAt`

### 1.2 Category hierarchy

`Category` 支持自关联：

- `parent`
- `children`

说明当前 schema 允许做树状分类，但 seed 里暂未真正建立有意义的 parent/child 结构。

### 1.3 Tool to category relation

通过 `ToolCategory` 做多对多关联：

- 一个 tool 可以属于多个 category
- 支持 `isPrimary`

这说明系统已经支持“主分类 + 辅助分类”的目录模型。

### 1.4 Category translation data

schema 中存在 `CategoryTranslation` 模型，说明系统已经为分类国际化留了模型空间。

但本次审计范围内，没有看到 category page 实际消费 `CategoryTranslation` 的实现，当前前台分类数据主要还是直接读 `Category` 主表。

### 1.5 SEO-related category linkage

存在 category 相关 SEO 连接点：

- `SeoComparePage` 可关联 `categoryId`
- sitemap 会生成 category URL
- category landing page 会生成 metadata + JSON-LD

## 2. How many categories exist in seed/database?

### 2.1 Seed counts

从 seed 代码可以确认：

- `prisma/seeds/taxonomy.ts` 默认 taxonomy：`5` 个 categories
- `prisma/seeds/public-catalog.ts` public catalog taxonomy：`22` 个 categories
- `prisma/seeds/bulk.ts` bulk profile：`100` 个 categories

### 2.2 Seed behavior by profile

`prisma/seed.ts` 的行为如下：

- `demo`：先写入默认 taxonomy `5` 个，再写入 public catalog `22` 个
- `all`：同 `demo`，并额外写入 bulk `100` 个
- `bulk`：默认 taxonomy `5` 个 + bulk `100` 个

### 2.3 Practical interpretation

由于 seed 使用 `upsertBySlug`，真实总数取决于 slug 是否重叠：

- 默认 taxonomy 的 5 个类目，全部也出现在 public catalog 中
- 所以 `demo` profile 最终可推断为 `22` 个有效 category，而不是 `27`
- `bulk` profile 会额外写入 `category-001` 到 `category-100` 这类 slug，因此可推断为 `105` 个有效 category
- `all` profile 可推断为 `122` 个有效 category

### 2.4 Current database count

本次会话中未完成对正在运行数据库实例的有效只读验证，因此：

- “当前数据库真实数量”无法在本次审计中做运行时确认
- 目前只能基于 seed 逻辑给出上面的可推断数量

结论：

- 若本地 DB 按默认 `pnpm db:seed` 执行，预期应为 `22` 个 categories
- 若按 `SEED_PROFILE=bulk`，预期应为 `105` 个 categories
- 若按 `SEED_PROFILE=all`，预期应为 `122` 个 categories

## 3. What fields are available?

### 3.1 Prisma model fields

`Category` 当前可用字段：

- `id`
- `slug`
- `name`
- `description`
- `parentId`
- `sortOrder`
- `iconUrl`
- `metaTitle`
- `metaDescription`
- `createdById`
- `updatedById`
- `deletedById`
- `metadata`
- `createdAt`
- `updatedAt`
- `deletedAt`

### 3.2 API DTO fields

后台 category CRUD DTO 当前实际暴露字段：

- `name`
- `slug`
- `description`
- `parentId`
- `sortOrder`
- `metaTitle`
- `metaDescription`

注意：

- `iconUrl` 虽然 schema 有，但 DTO 没有暴露
- `metadata` 虽然 schema 有，但 DTO 没有暴露

### 3.3 Admin client fields

Admin 前端 `AdminCategory` 当前只消费：

- `id`
- `name`
- `slug`
- `description`
- `sortOrder`
- `parentId`
- `createdAt`
- `updatedAt`

### 3.4 Public API returned fields

`GET /api/v1/categories`：

- 列表模式：`slug`, `name`, `description`
- 单类目模式（传 `slug`）：`category { slug, name, description }` + `tools[]`

缺少：

- `metaTitle`
- `metaDescription`
- `iconUrl`
- `parentId`
- `children`
- `toolCount`
- `breadcrumbs`
- `localized fields`

## 4. Which public category pages exist?

当前公开分类页面有两类：

### 4.1 Category index page

路由：

- `/{locale}/categories`

实现文件：

- `apps/web/src/app/[locale]/categories/page.tsx`

当前能力：

- 输出基础 metadata
- 输出 `ItemList` JSON-LD
- 输出 breadcrumb JSON-LD
- 展示 category cards
- 提供到分类详情页的入口
- 提供到 tools listing 且带 category query 的入口

### 4.2 Category detail page

路由：

- `/{locale}/category/{slug}`

实现文件：

- `apps/web/src/app/[locale]/category/[slug]/page.tsx`
- `apps/web/src/lib/catalog.ts#getCategoryLanding`
- `apps/web/src/components/seo/landing-page.tsx`

当前能力：

- 服务端按 slug 读取 category
- 拉取该 category 下最多 `12` 个最新 published tools
- 构建 landing metadata
- 输出 `CollectionPage` JSON-LD
- 输出 `FAQPage` JSON-LD
- 输出 breadcrumb JSON-LD
- 页面主体包含：
  - H1
  - AI Summary
  - Related Tools
  - Trending Tools
  - FAQ

### 4.3 Category links from other public pages

还有若干页面链接到 category：

- 首页
- tools 列表页
- search 页
- tool detail 页
- header/footer/showcase

这说明 category 已经是站内信息架构的一部分，但 category 自身仍不是强内容节点。

## 5. Which APIs are used?

### 5.1 Admin/private category APIs

控制器：

- `apps/api/src/categories/categories.controller.ts`

路由：

- `GET /categories`
- `GET /categories/tree`
- `GET /categories/slug/:slug`
- `GET /categories/:id`
- `POST /categories`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

服务能力：

- list
- tree
- find by id
- find by slug
- create
- update
- soft delete

### 5.2 Public API

控制器：

- `apps/api/src/public-api/public-api.controller.ts`

核心 category 相关路由：

- `GET /api/v1/categories`

两种模式：

- `?q=...` 或空查询：返回 category list
- `?slug=...`：返回单 category + tools

### 5.3 Web app data source

Web category 页面当前不是走 HTTP API，而是直接在服务端读 Prisma：

- `apps/web/src/lib/catalog.ts`

这意味着：

- public web 与 public API 存在两套 category data access path
- 字段格式和能力会逐渐分叉
- 后续如果要做缓存、边缘化、统一 SEO 输出，最好统一到一个 shared query layer

### 5.4 Admin page API usage

Admin categories 页面当前使用：

- `fetchCategories() -> /categories?pageSize=50`

只读取分页列表，没有使用：

- `/categories/tree`
- `/categories/:id`
- `/categories/slug/:slug`
- create/update/delete

## 6. What SEO data exists?

### 6.1 Stored SEO fields

Category 表中已有：

- `metaTitle`
- `metaDescription`

seed 也有写入：

- `metaTitle: ${category.name} AI Tools`
- `metaDescription: category.description`

### 6.2 Generated metadata

category detail metadata 由 `packages/seo/src/compare/index.ts#buildCategoryLandingMetadata` 生成：

- title: `Best {CategoryName} AI Tools`
- description: 优先 `category.metaDescription`，否则 fallback 文案
- canonical path: `/{locale}/category/{slug}`

category index page 自己手写 metadata：

- title
- description
- canonical
- openGraph
- twitter

### 6.3 Structured data

当前 category 相关 JSON-LD 包括：

- category index page：
  - `ItemList`
  - `BreadcrumbList`
- category detail page：
  - `CollectionPage`
  - `FAQPage`
  - `BreadcrumbList`

### 6.4 Sitemap coverage

API SEO service 会将 category URL 写入 sitemap：

- locale home entries 中包含 `/{locale}/categories`
- `category` chunk 中包含 `/{locale}/category/{slug}`

web 层只是代理 API sitemap：

- `/sitemap.xml`
- `/sitemaps/[chunk].xml`

### 6.5 Existing SEO strengths

当前已经具备：

- 可索引 category index
- 可索引 category detail
- canonical
- Open Graph
- Twitter card
- JSON-LD
- sitemap inclusion
- 内链入口

### 6.6 Existing SEO weaknesses

当前 SEO 数据仍比较薄：

- category 只有 `metaTitle` / `metaDescription` 两个显式字段
- 没有独立的 SEO copy blocks
- 没有 intro/FAQ/editorial body 的 CMS 化字段
- 没有 category-specific hero image / OG image
- 没有 indexability / noindex 控制
- 没有 alternate locale URL 明确输出
- 没有分页策略
- 没有子分类 landing SEO strategy
- category page 的 FAQ 是程序生成模板，不够差异化

## 7. What is missing for a production AI Tool Directory?

这是当前最关键的部分。

### 7.1 Missing fields

为了支撑 production AI Tool Directory，建议 category 至少补充以下字段：

- `shortDescription`
- `longDescription`
- `seoIntro`
- `seoBody`
- `seoFaq`
- `heroTitle`
- `heroSubtitle`
- `ogImageUrl`
- `coverImageUrl`
- `iconName` 或稳定 icon token
- `isFeatured`
- `isIndexable`
- `status`
- `locale`
- `localeSourceId` 或 translation linkage strategy
- `h1`
- `seoKeywords`
- `canonicalUrlOverride`
- `relatedCategoryIds`
- `featuredToolIds`
- `comparisonPageIds`
- `useCases`
- `buyerTypes`
- `jobToBeDone`
- `toolCountCache`
- `hasChildren`
- `depth`

### 7.2 Missing page types

当前只有 categories index 和 category detail，不够支撑目录站增长。缺少：

- 一级类目页与二级类目页区分
- 子分类页
- category + tag 组合页
- category + pricing 组合页
- category + use case 组合页
- category compare hub
- category alternatives hub
- category best-of editorial page
- category newest / trending / free 子集合页
- category glossary / buying guide / FAQ hub

### 7.3 Missing taxonomy strategy

目前 taxonomy 更像“平铺的功能标签化分类”，还不是完整目录 taxonomy。

缺少：

- 明确的一级类目定义
- 二级类目定义
- category 与 tag 的边界
- category 与 use case 的边界
- category 与 workflow 的边界
- category 去重策略
- 命名规范
- URL 规范
- slug governance

### 7.4 Missing admin capabilities

Admin 目前只有只读表格，缺少：

- create/edit/delete UI
- hierarchy editor
- slug editor
- SEO editor
- icon/cover 管理
- featured categories 管理
- category-to-tool curation
- category analytics
- indexability controls
- translation management

### 7.5 Missing frontend category UX

当前分类详情页是轻量 SEO landing，不像真正目录类目页。缺少：

- category hero
- tool listing with pagination
- sort controls
- filters
- subcategory navigation
- featured tools block
- compare tools block
- related tags
- related categories
- buying guide content
- editorial FAQ
- category stats
- recently added tools
- top rated / trending / free tools in category

## Current Status

### Data layer

- 有基础 category schema
- 有 hierarchy capability
- 有 tool relation
- 有基础 SEO 字段
- 有 translation model

### Seed layer

- demo/public/bulk 都有 category 数据
- taxonomy 可用于基础演示
- 但层级与生产治理不足

### API layer

- 后台 CRUD 齐备
- Public API 可读 category list 和 category detail-like payload
- 但字段较少，未形成完整 category contract

### Web layer

- 已有 `/categories`
- 已有 `/category/[slug]`
- category 可被首页、搜索、工具详情页内链引用

### SEO layer

- metadata、JSON-LD、sitemap 已打通
- 但内容深度和差异化仍偏弱

### Admin layer

- 已有 categories dashboard page
- 但仍是只读概览

## Missing Fields

建议优先新增以下字段组：

### Editorial content

- `shortDescription`
- `longDescription`
- `intro`
- `body`
- `faq`
- `selectionCriteria`
- `buyerGuide`

### SEO controls

- `h1`
- `seoTitle`
- `seoDescription`
- `seoKeywords`
- `canonicalUrl`
- `ogImageUrl`
- `robotsDirective`
- `indexPriority`

### Taxonomy management

- `status`
- `isFeatured`
- `depth`
- `path`
- `lineage`
- `relatedCategoryIds`
- `featuredToolIds`

### Analytics/cache

- `toolCountCache`
- `publishedToolCount`
- `updatedToolCount`
- `lastComputedAt`

### Localization

- `locale`
- `displayName`
- `localizedSlugStrategy`

## Missing Pages

建议补齐的 category 相关公开页：

- `/[locale]/categories`
  - 当前已有，但需要升级
- `/[locale]/category/[slug]`
  - 当前已有，但需要升级为完整目录页
- `/[locale]/category/[parent]/[child]`
- `/[locale]/category/[slug]/best`
- `/[locale]/category/[slug]/new`
- `/[locale]/category/[slug]/free`
- `/[locale]/category/[slug]/compare`
- `/[locale]/category/[slug]/alternatives`
- `/[locale]/category/[slug]/guide`
- `/[locale]/category/[slug]/faq`

## SEO Gaps

### Content gaps

- 分类页正文太短
- FAQ 是模板生成，差异化不足
- 没有 category-specific editorial depth

### Architecture gaps

- category index 和 detail page 的 metadata 实现分散
- web 直连 Prisma，public API 另有一套 query path
- 不利于 SEO contract 统一

### Internationalization gaps

- schema 有 `CategoryTranslation`
- 但 category 页面没有明显消费翻译数据
- locale-specific SEO 目前不完整

### Sitemap gaps

- 只有基础 category URL
- 没有 category 子集合页
- 没有 programmatic taxonomy expansion strategy

### Index quality gaps

- 没有对薄内容 category 页做质量门槛控制
- 没有按 tool count 控制是否 index
- 没有 category freshness / quality scoring

## Recommended Category Taxonomy

建议采用两层主 taxonomy，第三层慎用。

### Level 1: Primary categories

- Writing
- Image
- Video
- Audio
- Code
- Research
- Productivity
- Design
- Marketing
- SEO
- Sales
- Customer Support
- Education
- Data Analysis
- Automation
- Business Operations

### Level 2: Subcategories

示例：

- Writing
  - Blog Writing
  - Copywriting
  - Email Writing
  - Social Writing
- Image
  - Image Generation
  - Photo Editing
  - Design Assets
- Code
  - Code Assistant
  - Code Review
  - DevOps Automation
- Marketing
  - Content Marketing
  - Ad Creative
  - Landing Page Generation
- SEO
  - Keyword Research
  - On-page SEO
  - Programmatic SEO
  - Technical SEO

### Taxonomy rule

- category 表示“用户浏览目录时的主导航单元”
- tag 表示“横向过滤属性”
- use case 表示“任务导向入口”
- 不要让三者相互混淆

## Recommended Category Page Structure

建议标准 category page 结构如下：

1. Hero
- H1
- 价值主张
- tool count
- update freshness

2. Subcategory navigation
- 子分类入口
- related categories

3. Featured tools
- 编辑精选 3-6 个

4. Full tool listing
- sort
- pagination
- pricing/tag filters

5. Compare and alternatives block
- popular compare pages
- alternatives links

6. Buyer guide content
- 如何选择
- 适合谁
- 价格区间
- 常见能力

7. FAQ
- 编辑型 FAQ，不只是模板

8. Internal link modules
- related tags
- related use cases
- nearby categories
- best/new/free collection pages

9. Structured data
- BreadcrumbList
- CollectionPage
- FAQPage
- ItemList

## Risk List

### Product risks

- 当前 taxonomy 太平，用户难以形成“从类目进入再深挖”的浏览路径
- category 页面无法成为真正的 discovery hub

### SEO risks

- 薄内容 category 页可能难以获得稳定索引和排名
- 模板化 FAQ 与 summary 易导致页面差异度不足
- taxonomy 扩张后可能出现 keyword cannibalization

### Technical risks

- Web 直查 DB 与 Public API 双轨并存，后期字段容易漂移
- category translation 模型存在但未完整接入，后续 i18n 成本会升高
- 当前 admin 无法支撑 taxonomy 运营

### Data governance risks

- 缺乏 status/indexability/featured 治理字段
- 缺乏 parent-child 规范，未来容易出现错层和重复类目

## Implementation Plan

建议按 4 个阶段推进。

### Phase 1 - Audit closure and taxonomy definition

- 确认现有 DB 中真实 category 数量
- 冻结 category naming rules
- 定义 level 1 / level 2 taxonomy
- 明确 category / tag / use case 边界

### Phase 2 - Schema and admin upgrade

- 扩展 category schema 字段
- 补齐 admin create/edit workflow
- 增加 hierarchy editor
- 增加 SEO fields editor
- 增加 featured/indexability/status controls

### Phase 3 - Public page upgrade

- 升级 `/categories`
- 升级 `/category/[slug]` 为完整目录页
- 接入 pagination / sort / filter
- 增加 subcategory / related category / featured tools / compare 模块

### Phase 4 - SEO and programmatic expansion

- 接入 category translation output
- 增加 richer JSON-LD
- 扩展 sitemap strategy
- 增加 category quality scoring
- 逐步上线 category sub-pages 与组合页

## Direct Answers

### 1. What category data exists?

存在 category 主表、父子层级、tool-category 关联、基础 SEO 字段、translation 模型以及 category sitemap/landing SEO 输出。

### 2. How many categories exist in seed/database?

- 默认 taxonomy：5
- public catalog taxonomy：22
- bulk taxonomy：100
- 默认 `demo` seed 预期有效 category 总数：22
- `bulk` 预期：105
- `all` 预期：122
- 当前运行中数据库实例的真实数量本次未完成有效验证

### 3. What fields are available?

核心字段有：

- `id`, `slug`, `name`, `description`, `parentId`, `sortOrder`, `iconUrl`, `metaTitle`, `metaDescription`, `metadata`, `createdAt`, `updatedAt`, `deletedAt`

### 4. Which public category pages exist?

- `/{locale}/categories`
- `/{locale}/category/{slug}`

### 5. Which APIs are used?

- Admin/private：`/categories`, `/categories/tree`, `/categories/slug/:slug`, `/categories/:id`, `POST/PATCH/DELETE /categories/:id`
- Public API：`GET /api/v1/categories`
- Web 页面当前主要直接读 Prisma query layer

### 6. What SEO data exists?

- DB 字段：`metaTitle`, `metaDescription`
- 页面 metadata：title, description, canonical, OG, Twitter
- JSON-LD：`ItemList`, `CollectionPage`, `FAQPage`, `BreadcrumbList`
- sitemap：包含 `/categories` 与 `/category/{slug}`

### 7. What is missing for a production AI Tool Directory?

缺少更强的 taxonomy 设计、更丰富的 category schema、更完整的 admin 管理、更深的 category 页面内容、更系统的 SEO programmatic strategy，以及更清晰的 category/tag/use-case 信息架构。
