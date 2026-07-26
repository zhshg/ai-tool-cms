# Product Sprint 2 - Batch 2 Report

## Summary

本批次聚焦公开分类体验升级，仅改进：

- `/categories`
- `/category/[slug]`

遵循约束：

- 未改数据库 schema
- 未加 Prisma migration
- 未修改 API contract
- 复用现有 `apps/web/src/lib/catalog.ts` query layer

## Files Modified

- `apps/web/src/app/[locale]/categories/page.tsx`
- `apps/web/src/app/[locale]/category/[slug]/page.tsx`
- `apps/web/src/lib/catalog.ts`
- `apps/web/src/components/category/category-directory.tsx`
- `docs/product/ProductSprint2_Batch2_Report.md`

## Screens Changed

### Categories Index

- `/[locale]/categories`

### Category Detail

- `/[locale]/category/[slug]`

## UX Improvements

### Categories Index

- 将原始轻量列表升级为目录式 landing layout
- 增加 hero 区域
- 增加统计卡片：
  - category count
  - tool count
  - featured count
- 分类卡片升级为统一视觉系统：
  - icon / placeholder
  - category name
  - short description
  - tool count
  - featured badge
  - CTA
- 增加更稳定的 hover state、spacing 和 typography
- 增加“Quick start”推荐工具面板

### Category Detail

- 将原有轻量 SEO landing 升级为完整 category landing page
- Hero 区域新增：
  - category title
  - description
  - tool count
  - updated timestamp
  - featured state
- 主内容区新增：
  - Featured tools
  - All tools
  - Trending tools
  - Related categories
  - FAQ

### Tool Cards

- 工具卡片新增：
  - logo / placeholder
  - tool name
  - one-line summary
  - pricing badge
  - rating（有数据才显示）
  - category chips
  - Open Tool button
  - Visit Site button

### Internal Linking

- 新增内部链接模块：
  - Back to Categories
  - Related Categories
  - Popular Categories
  - Popular Collections
- 右侧 sidebar 新增：
  - Top Categories
  - Newest Tools
  - Popular Collections
  - Blog Guides

### Breadcrumb

- 页面 breadcrumb 改为：
  - Home
  - Categories
  - Current Category
- 现有 JSON-LD breadcrumb 继续保留
- category detail 的 JSON-LD breadcrumb 现已补上 `Categories` 中间层

## Performance Notes

- 未引入新的 API 层依赖
- 继续复用 `apps/web/src/lib/catalog.ts`
- category detail 查询改为在同一 query layer 聚合：
  - category main data
  - category tools
  - popular categories
  - newest tools
  - collection links
- 避免了页面层自行散落查询
- 未修改现有 metadata contract
- 未移除现有 JSON-LD 输出

## Validation

已通过：

- `pnpm typecheck`
- `pnpm lint`

## Remaining Work

- 目前 rating 依赖 review 数据，若无 review 会隐藏，不做占位评分
- 当前“featured category”仍基于 metadata / toolCount / sortOrder 做前台推断，尚无专门 CMS 配置入口
- 工具卡仍未接入更细粒度的 editorial ranking
- 右侧 Blog Guides 目前使用现有 blog hub 作为导航入口，后续可接真实文章详情页
- 若后续继续迭代，建议增加：
  - category pagination
  - category sort / filter
  - subcategory navigation
  - stronger editorial body blocks
