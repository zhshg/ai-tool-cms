# Product Sprint 6 - Collections

## 目标

为公开站点补齐用于 SEO 增长的集合页：

- `/[locale]/best-ai-tools`
- `/[locale]/free-ai-tools`
- `/[locale]/new-ai-tools`
- `/[locale]/trending-ai-tools`

要求使用真实工具数据，提供 SEO metadata、排序列表、FAQ 和内部链接，并纳入 sitemap。

## 实现内容

### 1. 新增四个集合页路由

已新增：

- `apps/web/src/app/[locale]/best-ai-tools/page.tsx`
- `apps/web/src/app/[locale]/free-ai-tools/page.tsx`
- `apps/web/src/app/[locale]/new-ai-tools/page.tsx`
- `apps/web/src/app/[locale]/trending-ai-tools/page.tsx`

四个页面统一复用现有 `SeoLandingPage` 组件，不重复引入新的展示逻辑。

### 2. 新增集合页数据层

在 `apps/web/src/lib/catalog.ts` 中新增：

- `CollectionPageSlug`
- `fetchPopularTools`
- `buildCollectionFaqs`
- `buildCollectionMetadata`
- `getCollectionCopy`
- `getCollectionLanding`

数据策略：

- `best-ai-tools`：按站内热度快照数量优先，其次按发布时间排序
- `free-ai-tools`：基于 `FREE` 与 `FREEMIUM` 真实工具数据
- `new-ai-tools`：按发布时间倒序
- `trending-ai-tools`：优先站内热度排序，并与最新已发布工具集合结合

### 3. SEO 与结构化数据

每个集合页均输出：

- 页面级 metadata
- `CollectionPage` JSON-LD
- `ItemList` JSON-LD
- `FAQPage` JSON-LD
- `BreadcrumbList` JSON-LD

### 4. Sitemap 纳入

在 `apps/api/src/seo/seo.service.ts` 中，将四个集合页路径加入 locale sitemap 生成逻辑。

## 验证

### 本地质量检查

- `pnpm lint`：PASS
- `pnpm typecheck`：PASS

### 构建验证

- `pnpm --filter @ai-tool-cms/web build`：PASS
- `docker compose --env-file .env.production -f docker-compose.prod.yml build web api`：PASS

### 生产路由验证

通过生产 compose 重建并启动后验证：

- `http://localhost/en/best-ai-tools`：200
- `http://localhost/en/free-ai-tools`：200
- `http://localhost/en/new-ai-tools`：200
- `http://localhost/en/trending-ai-tools`：200

### Sitemap 验证

检查 `http://localhost/sitemaps/en.xml`，以下路径均已包含：

- `best-ai-tools`
- `free-ai-tools`
- `new-ai-tools`
- `trending-ai-tools`

## 结果

本次 Sprint 已完成集合页落地、SEO 接入和 sitemap 纳管，且未修改 admin 逻辑与后端业务接口。
