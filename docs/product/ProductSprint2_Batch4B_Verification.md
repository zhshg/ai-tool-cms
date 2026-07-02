# Product Sprint 2 - Batch 4B Verification

日期：2026-07-03

## 当前已成功

- Batch 4A 导入框架文档已存在并落库到仓库：
  - `docs/import/ToolImportSpecification.md`
  - `docs/import/tool-import-template.csv`
  - `docs/import/tool-import-schema.json`
- Batch 4B 首批 50 个真实 AI 工具数据集已存在：
  - `docs/import/first-50-ai-tools.json`
  - `prisma/seeds/curated-tools.ts`
  - `prisma/seeds/validate-curated-tools.ts`
- `prisma/seed.ts` 已切到 curated dataset 流程，默认 `demo` profile 会执行 `seedCuratedTools(...)`。
- 前台分类页当前代码已具备 Batch 2 要求的页面结构：
  - `/categories` 使用 `getCategoriesPageData(locale)`
  - `/category/[slug]` 使用 `getCategoryLanding(slug, locale)`
  - 页面组件已包含：
    - 分类卡片
    - Hero
    - Featured tools
    - All tools
    - Trending tools
    - Related categories
    - Sidebar
    - Breadcrumb
    - JSON-LD 输出

## 当前混合数据风险

- 之前抽样结果显示数据库曾存在混合数据：
  - `tools: 51`
  - `categories: 20`
  - `tags: 194`
  - `faqs: 100`
  - `pricingPlans: 50`
- 这说明当前库里不是“纯净 50 条 curated tools”，而是：
  - 50 条真实 AI 工具数据
  - 叠加少量旧 taxonomy / demo 历史残留
- 旧 taxonomy 来源已确认：
  - `prisma/seeds/taxonomy.ts`
  - 默认写入 5 个 legacy 分类：
    - `ai-writing`
    - `image-generation`
    - `code-assistant`
    - `productivity`
    - `video-audio`
- 风险：
  - `/categories` 可能混出旧分类
  - `/category/[slug]` 可能出现不符合新 professional taxonomy 的落地页
  - 当前页面验收如果基于“混合库”，结果不适合作为最终内容验收结论

## 干净库验证结果

- 已执行本地开发库清理：
  - `docker compose down -v`
- 已重新拉起基础容器：
  - `pnpm docker:up`
- 结果：
  - 基础设施容器可启动
  - 但“从零空库初始化”链路未完全打通

### 实际阻塞点

- `pnpm db:migrate:deploy` 在全新库上失败
- `pnpm db:seed` 随后失败，报错为 `public.permissions` 表不存在

### 根因判断

- 当前本地初始化链路依赖已有数据库状态，尚未做到真正可重复的空库初始化。
- 新建 Postgres 后日志显示存在连接用户不一致问题：
  - 容器创建的是 `POSTGRES_USER=user`
  - 但实际有进程尝试用 `ai_tool_cms` 用户连接
- 因此这次“干净库验证”得到的核心结论是：
  - 旧数据问题已经被清掉
  - 但当前仓库的本地 Prisma 初始化链路还需要继续修复，才能完成真正的 clean-room seed 验证

## 前台页面验收结论

### 代码层验收

- `/categories` 页面已确认接入真实 catalog 查询层。
- `/category/[slug]` 页面已确认接入真实 category landing 查询层。
- 组件结构与 Batch 2 目标基本一致，未发现回退成轻量列表页。

### 运行层验收

- 当前无法完成浏览器级页面验收，原因不是页面代码本身，而是本地入口不可访问：
  - `http://localhost/` 无法访问
  - `http://localhost:3000/` 无法访问
  - `http://localhost:4000/health` 无法访问

### localhost 不可访问原因

- `nginx` 容器持续重启
- 日志已确认错误：
  - `duplicate upstream "web" in /etc/nginx/conf.d/production.conf:1`
- 这意味着当前访问失败属于本地网关配置问题，不是分类页功能逻辑本身的问题

## 本轮结论

- 已成功确认：
  - 50 条真实 AI 工具数据方案已接入 seed 流程
  - 分类页与分类详情页代码结构符合 Batch 2 / 4 的方向
  - 旧 taxonomy / demo 残留确实会污染页面展示
- 已成功暴露：
  - 本地空库初始化链路还不稳定
  - 本地 nginx 网关配置存在重复 upstream 问题
- 当前最重要的剩余风险：
  - 在修复 `migrate + seed` clean-room 链路前，无法对“纯净 50 条真实目录数据”做最终页面验收
  - 在修复 `nginx` 或直接启动本地 `web/api` 开发进程前，无法完成浏览器访问验收

## 建议的下一步

1. 先修复本地 Prisma clean-room 初始化链路，确保空库下 `db:migrate:deploy` 和 `db:seed` 可重复执行。
2. 关闭或修复当前异常的 `nginx` 代理配置，恢复 `localhost` 访问。
3. 基于纯净库重新抽样验证：
   - tools
   - categories
   - tags
   - faqs
   - pricingPlans
4. 再做一次真正的 `/categories` 与 `/category/[slug]` 浏览器验收。
