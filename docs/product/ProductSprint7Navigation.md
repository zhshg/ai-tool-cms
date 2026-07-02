# Product Sprint 7 - Navigation

## 目标

改造公开站点导航与布局，统一所有 public 页面外壳：

- 高信息密度目录站风格的 Header
- 多列 Footer
- 移动端顶部汉堡抽屉导航
- Admin 布局保持不变

## 实现内容

### 1. 统一 Public Layout

新增：

- `apps/web/src/components/marketing/public-site-layout.tsx`

并在：

- `apps/web/src/app/[locale]/layout.tsx`

中接入统一公共壳，使公开页面默认共享同一套 header/footer。

### 2. Header 重构

更新：

- `apps/web/src/components/marketing/site-header.tsx`

实现：

- logo / 站点名
- 顶部搜索框
- 主导航：`Categories` / `Tools` / `Blog`
- 移动端搜索入口
- 顶部汉堡按钮
- 移动端抽屉式导航与热门分类快捷入口

### 3. Footer 重构

更新：

- `apps/web/src/components/marketing/site-footer.tsx`

实现：

- 热门分类
- 热门工具
- 站点链接
- sitemap / robots / rss / collection 页面链接

### 4. 公共导航数据层

更新：

- `apps/web/src/lib/catalog.ts`

新增：

- `getPublicShellData`
- `getCategoriesPageData`
- 公共分类与热门工具查询能力

### 5. 新增 Categories 页面

新增：

- `apps/web/src/app/[locale]/categories/page.tsx`

提供独立分类入口页，符合 header 中 `Categories` 进入独立页面的要求。

### 6. 去除重复页面壳

已从以下 public 页面中移除手写的 header/footer，改为使用统一 layout：

- 首页
- blog
- tools
- search
- tool detail
- changelog
- docs
- pricing
- showcase
- tools/search 的 loading 与 error 页面

### 7. Sitemap 补充

更新：

- `apps/api/src/seo/seo.service.ts`

将 `/${locale}/categories` 纳入 locale sitemap。

## 验证

### 代码检查

- `pnpm lint`：PASS
- `pnpm typecheck`：PASS

### 构建检查

- `pnpm --filter @ai-tool-cms/web build`：PASS
- `pnpm --filter @ai-tool-cms/api build`：PASS
- `docker compose --env-file .env.production -f docker-compose.prod.yml build web api`：PASS

### 生产运行验证

已执行：

- `docker compose --env-file .env.production -f docker-compose.prod.yml up -d web api nginx`

验证结果：

- `http://localhost/en`：200
- `http://localhost/en/tools`：200
- `http://localhost/en/category/ai-writing`：200
- `http://localhost/en/search?q=ai`：200
- `http://localhost/en/blog`：200
- `http://localhost/en/categories`：200
- `http://localhost/admin`：200

公共页面 HTML 中均验证到统一 header 与 footer 关键内容：

- `AI Tool Directory`
- `Categories`
- `Tools`
- `Blog`
- `Popular categories`
- `Popular tools`
- `Sitemap`

移动端 User-Agent 请求首页返回 200，且可检测到移动端菜单按钮标记。

## 结果

本次 Sprint 已完成公开站点统一导航与布局改造，admin 未被改动，公开页面导航结构已统一。
