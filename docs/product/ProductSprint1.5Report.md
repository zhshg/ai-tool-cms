# Product Sprint 1.5 Report

日期：2026-07-02

## Scope

本次 Sprint 仅处理 public 网站的以下问题：

- 品牌清理
- SEO metadata 清理
- canonical / OpenGraph 一致性
- robots / sitemap 一致性
- Collections / Blog public wording 收口

未修改 Admin 业务逻辑，未新增业务功能。

## Files Modified

- `packages/config/src/schema.ts`
- `packages/seo/src/site-config.ts`
- `packages/seo/src/metadata/index.ts`
- `packages/seo/src/compare/index.ts`
- `apps/api/src/seo/seo.service.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/[locale]/page.tsx`
- `apps/web/src/app/[locale]/blog/page.tsx`
- `apps/web/src/app/[locale]/search/page.tsx`
- `apps/web/src/app/[locale]/tools/page.tsx`
- `apps/web/src/components/marketing/site-footer.tsx`
- `apps/web/src/lib/catalog.ts`
- `apps/web/src/lib/seo.ts`
- `apps/web/messages/en.json`
- `apps/web/messages/zh.json`

## What Changed

- public `siteName` 对 legacy 值 `AI Tool CMS` 做了规范化，统一为 `AI Tool Directory`
- public metadata 文案统一替换旧 CMS branding
- 修复 `robots.txt` 的 sitemap URL，改为运行时 `siteUrl`
- locale sitemap 补齐 `/en/blog`
- category metadata 去掉重复措辞，例如：
  - `Best AI Writing AI Tools`
  - 修正为 `Best AI Writing Tools`
- Blog metadata、首页 metadata、Tools / Search metadata 统一到目录站语义
- 重写损坏的 `en.json` / `zh.json` public 文案，清理坏编码和旧品牌
- 修复若干被错误替换破坏的 TS/JSON/UTF-8 文件

## Verification Results

### Code Quality

- `pnpm lint` : PASS
- `pnpm typecheck` : PASS
- `pnpm build` : PASS

### Docker Production Build

- `docker compose --env-file .env.production -f docker-compose.prod.yml build web api nginx` : PASS
- 额外验证 `docker compose --env-file .env.production -f docker-compose.prod.yml build web` : PASS

### Docker Runtime

- `docker compose --env-file .env.production -f docker-compose.prod.yml up -d web api nginx` : PASS
- `web` healthy : PASS
- `api` healthy : PASS
- `migrate` completed : PASS
- `search-bootstrap` completed : PASS

### Public Routes

- `GET http://localhost/en` : PASS
- `GET http://localhost/en/tools` : PASS
- `GET http://localhost/en/categories` : PASS
- `GET http://localhost/en/category/ai-writing` : PASS
- `GET http://localhost/en/best-ai-tools` : PASS
- `GET http://localhost/en/trending-ai-tools` : PASS
- `GET http://localhost/en/search` : PASS
- `GET http://localhost/en/blog` : PASS
- `GET http://localhost/sitemap.xml` : PASS
- `GET http://localhost/sitemaps/en.xml` : PASS
- `GET http://localhost/robots.txt` : PASS

### Metadata Checks

- Homepage title: `AI Tool Directory Home | AI Tool Directory` : PASS
- Category title: `Best AI Writing Tools | AI Tool Directory` : PASS
- Blog title: `AI Tool Directory Blog | AI Tool Directory` : PASS
- `robots.txt` sitemap:
  - `http://localhost/sitemap.xml`
  - PASS
- `/sitemaps/en.xml` contains `/en/blog` : PASS
- Collections included in locale sitemap : PASS

### Branding Checks

- public source no longer exposes old branding in page content / metadata output : PASS
- remaining `AI Tool CMS` source hits are only defensive normalization logic in SEO helpers : PASS

## Remaining Warnings

- `.env.production` 仍保留 `SITE_NAME=AI Tool CMS`。当前 public runtime 已通过代码兼容层改写为 `AI Tool Directory`，不会影响 public 输出，但该环境值本身仍是 legacy 配置。
- `apps/admin` 仍是独立 Admin 产品命名，未在本 Sprint 调整。这是预期行为。
- 旧 public marketing / docs / changelog 路由仍保留代码结构，仅做 branding 和 metadata 收口，没有做信息架构清理。

## Recommendations

- 将 `.env.production` 和 `.env.production.example` 中的 public `SITE_NAME` 逐步显式迁移为 `AI Tool Directory`，避免继续依赖兼容分支。
- 后续可把 public branding 从环境变量中拆分为独立 `PUBLIC_SITE_NAME`，彻底与 Admin branding 解耦。
- 若下一 Sprint 继续做 Technical SEO，可补充：
  - category / collection 的更细粒度 structured data
  - blog detail pages
  - localized metadata 审计
