# Release Sprint Step 5: SEO Launch Readiness

## Summary

本次交付聚焦 SEO 上线就绪性，完成了以下范围内的修复与确认：

- 修正生产环境 `siteUrl` 的默认解析逻辑，避免 SEO 元数据在生产环境回退到 `localhost`
- 修正 `sitemap.xml` fallback 输出，确保 sitemap index 使用统一站点配置并覆盖 locale/content sitemap
- 在 Admin SEO 页面补充 Google Search Console、Bing Webmaster、IndexNow 的手工配置说明
- 验证 canonical、OpenGraph、Twitter metadata 仍走统一 SEO 元数据构建链路

## Files Modified

- [packages/seo/src/site-config.ts](/F:/project/ai-tool-cms/packages/seo/src/site-config.ts)
- [apps/web/src/app/sitemap.xml/route.ts](/F:/project/ai-tool-cms/apps/web/src/app/sitemap.xml/route.ts)
- [apps/admin/src/app/(dashboard)/seo/page.tsx](/F:/project/ai-tool-cms/apps/admin/src/app/(dashboard)/seo/page.tsx)
- [docs/release/Step5_SEOLaunchReadiness.md](/F:/project/ai-tool-cms/docs/release/Step5_SEOLaunchReadiness.md)

## What Was Verified

### 1. robots.txt

- [apps/web/src/app/robots.ts](/F:/project/ai-tool-cms/apps/web/src/app/robots.ts) 使用 `getSiteConfig().siteUrl`
- 代码路径正确，会基于统一站点配置输出 sitemap URL
- 当前运行中的 `http://localhost/robots.txt` 仍然指向 `localhost`

结论：

- 代码层没问题
- 当前运行时环境仍未达到生产上线要求，因为 `.env.production` 仍配置为 `http://localhost`

### 2. sitemap.xml

- [apps/web/src/app/sitemap.xml/route.ts](/F:/project/ai-tool-cms/apps/web/src/app/sitemap.xml/route.ts) 已改为统一使用 `getSiteConfig()` 与 `SITEMAP_CHUNK_IDS`
- fallback sitemap index 不再硬编码 `localhost`
- [apps/api/src/seo/seo.service.ts](/F:/project/ai-tool-cms/apps/api/src/seo/seo.service.ts) 已确认 locale sitemap 包含：
  - homepage
  - tools page
  - tool detail pages
  - categories page
  - category detail pages
  - collections
  - blog

结论：

- sitemap 结构在代码层满足 launch readiness 要求
- locale sitemap 已覆盖 blog 与 collections

### 3. Canonical URLs

- [packages/seo/src/metadata/index.ts](/F:/project/ai-tool-cms/packages/seo/src/metadata/index.ts) 统一输出 `alternates.canonical`
- canonical 基于 `config.siteUrl + path` 生成
- [packages/seo/src/site-config.ts](/F:/project/ai-tool-cms/packages/seo/src/site-config.ts) 已避免生产环境默认回退到 `localhost`

结论：

- canonical 生成链路正确
- 实际线上 canonical 是否正确，仍取决于生产环境真实域名配置

### 4. OpenGraph and Twitter

- 同一套元数据构建器统一生成：
  - `openGraph`
  - `twitter`
- 支持站点名、标题、描述、OG 图片、Twitter card
- `siteName` 在 public SEO 层会把 `AI Tool CMS` 规范化为 `AI Tool Directory`

结论：

- 公开站点 metadata 已避免继续使用旧 CMS branding 作为最终前台品牌输出

## Admin SEO Configuration Center

已在 [apps/admin/src/app/(dashboard)/seo/page.tsx](/F:/project/ai-tool-cms/apps/admin/src/app/(dashboard)/seo/page.tsx) 增加 `Launch Configuration Guide`，覆盖以下内容：

- Google Search Console 手工配置步骤
- Bing Webmaster 手工配置步骤
- IndexNow 手工配置步骤
- locale sitemap 说明

当前不要求 live OAuth，本批次只要求：

- 配置入口存在
- 配置说明清晰
- 可为后续真实接入保留字段与操作路径

## Manual Configuration Instructions

### Google Search Console

1. 将生产环境 `APP_URL`、`NEXT_PUBLIC_APP_URL`、`SITE_URL`、`NEXT_PUBLIC_SITE_URL` 配置为真实域名
2. 在 Google Search Console 中添加完全一致的 property URL
3. 使用 DNS 或 HTML meta tag 完成站点验证
4. 在 Admin SEO 页面保存：
   - `Site URL`
   - `Property ID`
   - `Property Name`
5. 如后续启用 live sync，再补充 OAuth token

### Bing Webmaster

1. 在 Bing Webmaster Tools 中添加生产域名
2. 使用 XML file、meta tag 或 DNS 完成验证
3. 获取可用 API key
4. 在 Admin SEO 页面保存：
   - `Site URL`
   - `API Key`
   - `Verification Status`

### IndexNow

1. 生成 IndexNow key
2. 将 key file 部署到生产域名根路径
3. 在 Admin SEO 页面启用 `IndexNow`
4. 保存 `IndexNow Key`
5. 上线后配合 sitemap ping 使用

## Validation Run

已通过：

- `pnpm --filter @ai-tool-cms/web lint`
- `pnpm --filter @ai-tool-cms/web typecheck`
- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/admin typecheck`
- `pnpm --filter @ai-tool-cms/seo typecheck`

## Launch Blockers / Residual Risks

### Blocker 1: `.env.production` 仍使用 localhost

当前 [\.env.production](/F:/project/ai-tool-cms/.env.production) 仍包含：

- `APP_URL=http://localhost`
- `NEXT_PUBLIC_APP_URL=http://localhost`
- `API_URL=http://localhost`
- `NEXT_PUBLIC_API_URL=http://localhost`
- `CORS_ORIGINS=http://localhost`

这意味着即使代码层已修复 fallback，当前运行中的 SEO 输出仍然会表现为本地域名。

上线前必须替换为真实生产域名。

### Blocker 2: 运行态验证仍基于本地环境

当前 `http://localhost/robots.txt`、`http://localhost/sitemap.xml` 的输出仍受本地环境配置影响。

因此本轮能确认的是：

- 代码路径已修正
- 文档与配置入口已补齐

还不能声明：

- 当前容器运行态已经是最终生产 SEO 输出

## Recommended Pre-Launch Checklist

1. 将 `.env.production` 中所有 public URL 替换为真实生产域名
2. 重新构建并重启 `web`、`admin`、`api`、`nginx`
3. 重新验证：
   - `/robots.txt`
   - `/sitemap.xml`
   - `/sitemaps/en.xml`
   - 关键工具详情页 canonical
   - 关键分类页 OpenGraph/Twitter
4. 在 Admin SEO 页面录入 GSC / Bing / IndexNow 配置
5. 上线后向搜索引擎提交 sitemap

## Final Status

当前 Step 5 可以视为“代码与配置层准备完成，环境切换待执行”。

已完成：

- robots / sitemap / metadata 代码链路修正
- SEO settings UI / 配置说明补齐
- lint / typecheck 校验通过

待上线前执行：

- 生产域名环境变量替换
- 基于真实域名的最终联调验证
