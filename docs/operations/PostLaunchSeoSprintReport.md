# Post Launch SEO Sprint Report

## 1. 当前线上状态

- 已确认正常访问：
  - `https://toolsdar.io/en`
  - `https://toolsdar.io/en/tools`
  - `https://toolsdar.io/en/categories`
  - `https://toolsdar.io/en/search`
  - `https://toolsdar.io/sitemap.xml`
  - `https://toolsdar.io/robots.txt`
  - `https://api.toolsdar.io/v1/health`
- 本轮未修改已上线 URL 结构。
- 本轮未开启 `TOOLS_AUTO_APPLY=true`，也未执行任何生产写库操作。

## 2. Sitemap 检查结果

### 线上现状

- `sitemap.xml` 当前是 sitemap index。
- 已包含：
  - locale sitemap：`/sitemaps/en.xml`、`/sitemaps/zh-CN.xml`
  - 内容 sitemap：`tool`、`category`、`tag`、`prompt`、`compare`、`rss`
- `/sitemaps/en.xml` 已确认包含：
  - `/en`
  - `/en/tools`
  - `/en/categories`
  - `/en/search`
  - 已发布工具详情页
  - 分类详情页

### 本轮修复

- 已扩展 API sitemap collection 白名单，新增以下 SEO 榜单页：
  - `/en/best-ai-writing-tools`
  - `/en/best-ai-image-generators`
  - `/en/best-ai-video-generators`
  - `/en/best-ai-coding-tools`
  - `/en/best-ai-seo-tools`
  - `/en/ai-tools-for-productivity`
- 相关代码：
  - [apps/api/src/seo/seo.service.ts](/F:/project/ai-tool-cms/apps/api/src/seo/seo.service.ts)

### 结论

- sitemap 主体结构可用。
- 已发布工具和分类页应继续保留。
- draft 工具、后台页面、API 页面不应进入 sitemap。
- 新增榜单页代码已补齐，但尚未在本地完成 build/typecheck 验证，待 CI 或可用环境复核。

## 3. Robots 检查结果

### 线上现状

- 当前 robots 允许前台抓取。
- 已包含后台和 API 的基本限制。
- 已声明 sitemap 地址。

### 本轮修复

- 增补 `Disallow: /v1/`，避免搜索引擎抓取 API 路径。
- 相关代码：
  - [apps/web/src/app/robots.ts](/F:/project/ai-tool-cms/apps/web/src/app/robots.ts)

### 结论

- 符合前台允许抓取、后台和 API 禁抓的目标。

## 4. Canonical 检查结果

### 已核查页面

- `/en`
- `/en/tools`
- `/en/categories`
- `/en/search`
- 工具详情页示例：`/en/tools/chatgpt`
- 分类详情页示例：`/en/category/writing`

### 结果

- canonical 基本指向正式 `https://toolsdar.io/...`
- 未发现：
  - `http`
  - `localhost`
  - `api.toolsdar.io`
  - 重复语言路径

### 本轮修复

- 统一 metadata locale 推断逻辑，避免 Open Graph locale 固定为默认语言。
- 相关代码：
  - [packages/seo/src/metadata/index.ts](/F:/project/ai-tool-cms/packages/seo/src/metadata/index.ts)

## 5. Meta SEO 检查结果

### 线上现状

- 页面 title 和 description 主体已存在。
- canonical 基本正常。
- 发现的问题主要集中在：
  - 某些页面缺失 `og:image`
  - `twitter:card` 规格不统一
  - Open Graph locale 不够准确

### 本轮修复

- 给全站 metadata 增加默认 `og:image` 回退：
  - `${siteUrl}/toolsddar-logo.png`
- 统一 `twitter:card` 逻辑：
  - 有 `og:image` 时使用 `summary_large_image`
  - 无图时回退 `summary`
- 相关代码：
  - [packages/seo/src/site-config.ts](/F:/project/ai-tool-cms/packages/seo/src/site-config.ts)
  - [packages/seo/src/metadata/index.ts](/F:/project/ai-tool-cms/packages/seo/src/metadata/index.ts)

### 结论

- Meta 基础设施已更统一。
- 后续建议继续为首页、分类页、榜单页准备更稳定的专用 OG 图，而不是长期只依赖默认图。

## 6. 新增 SEO 页面列表

### 本轮已补齐路由

- `/[locale]/best-ai-writing-tools`
- `/[locale]/best-ai-image-generators`
- `/[locale]/best-ai-video-generators`
- `/[locale]/best-ai-coding-tools`
- `/[locale]/best-ai-seo-tools`
- `/[locale]/ai-tools-for-productivity`

### 既有页面继续复用

- `/[locale]/best-ai-tools`
- `/[locale]/free-ai-tools`

### 页面能力

- 已接入：
  - SEO metadata
  - canonical
  - FAQ JSON-LD
  - ItemList JSON-LD
  - Last updated 展示
  - 工具列表输出

### 相关代码

- [apps/web/src/lib/catalog.ts](/F:/project/ai-tool-cms/apps/web/src/lib/catalog.ts)
- [apps/web/src/components/seo/landing-page.tsx](/F:/project/ai-tool-cms/apps/web/src/components/seo/landing-page.tsx)
- [apps/web/src/app/[locale]/best-ai-writing-tools/page.tsx](/F:/project/ai-tool-cms/apps/web/src/app/[locale]/best-ai-writing-tools/page.tsx)
- [apps/web/src/app/[locale]/best-ai-image-generators/page.tsx](/F:/project/ai-tool-cms/apps/web/src/app/[locale]/best-ai-image-generators/page.tsx)
- [apps/web/src/app/[locale]/best-ai-video-generators/page.tsx](/F:/project/ai-tool-cms/apps/web/src/app/[locale]/best-ai-video-generators/page.tsx)
- [apps/web/src/app/[locale]/best-ai-coding-tools/page.tsx](/F:/project/ai-tool-cms/apps/web/src/app/[locale]/best-ai-coding-tools/page.tsx)
- [apps/web/src/app/[locale]/best-ai-seo-tools/page.tsx](/F:/project/ai-tool-cms/apps/web/src/app/[locale]/best-ai-seo-tools/page.tsx)
- [apps/web/src/app/[locale]/ai-tools-for-productivity/page.tsx](/F:/project/ai-tool-cms/apps/web/src/app/[locale]/ai-tools-for-productivity/page.tsx)

## 7. 性能初步优化建议

### 已确认

- `ToolLogo` 已使用懒加载。
- 首页和列表页图片链路已基本走优化路径。

### 建议

- 首页 LCP 重点关注 hero/logo/首屏卡片，避免首屏引入过多非关键脚本。
- 针对榜单页和分类页，优先保证首屏前 4 到 6 个卡片的 HTML 直出。
- 继续审查字体加载，避免阻塞渲染。
- 为默认 OG 图和品牌图准备稳定资源，减少动态图片带来的响应波动。
- 后续在真实部署环境补跑 Lighthouse / PageSpeed，重点看：
  - LCP
  - CLS
  - 移动端 JS 体积
  - 首屏图片优先级

### 说明

- 本轮未成功实际跑 Lighthouse/PageSpeed，只能给出代码级建议。

## 8. 自动更新 manual-review 结果

### 执行目标

- 命令目标：
  - `pnpm run tools:auto-update -- --mode=manual-review --limit=10`
- 要求：
  - 不写生产库
  - 不 create
  - 不 update
  - 不 delete
  - 不 archive

### 实际结果

- 已多次尝试执行，包括非沙箱模式。
- 均被本地工作区 `pnpm` 依赖导入阶段阻塞，未真正进入 `tools:auto-update` 业务逻辑。
- 典型错误：
  - `ERR_PNPM_EPERM`
  - `EPERM: operation not permitted, rename ...`
- 因此本轮无法给出：
  - 抓取来源
  - 候选工具数量
  - 重复数量
  - 高/低置信度数量
  - 报告路径

### 安全确认

- 本轮没有执行 `--apply`
- 没有写生产库
- 没有 create/update/delete/archive 工具数据

## 9. 验证与阻塞

### 已完成

- 代码层已补齐新增榜单页路由
- 代码层已补齐 sitemap collection 入口
- 代码层已补齐 robots API 限制
- 代码层已统一默认 OG / twitter / locale metadata 逻辑

### 当前阻塞

- `pnpm typecheck` 未能完成
- `pnpm run tools:auto-update -- --mode=manual-review --limit=10` 未能完成
- 根因是当前环境的 `pnpm install` / import 阶段反复触发权限与依赖导入异常，不是生产数据库或 URL 结构问题

## 10. 下一步建议

1. 在 CI 或一台干净的 Linux/WSL 环境执行：
   - `pnpm install --frozen-lockfile`
   - `pnpm typecheck`
   - `pnpm build`
2. 在可正常安装依赖的环境重新执行：
   - `pnpm run tools:auto-update -- --mode=manual-review --limit=10`
3. 部署后复查：
   - `https://toolsdar.io/sitemap.xml`
   - `https://toolsdar.io/sitemaps/en.xml`
   - 新榜单页是否返回 200
4. 下一轮补强：
   - 为榜单页增加更强的内链模块
   - 为首页、分类页、榜单页准备独立 OG 图
   - 正式跑 Lighthouse / PageSpeed 并做针对性优化
