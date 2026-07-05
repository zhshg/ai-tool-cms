# RC4 Deployment Report

## 概览

- 项目：`ai-tool-cms`
- 分支：`feature/product-home`
- 服务器：`154.48.226.152`
- 验收日期：`2026-07-06`

## Docker

- 已补充 `docker/Dockerfile.node` 的 `pnpm install` 重试与超时参数。
- 生产执行了 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build web api`。
- `web`、`api`、`nginx` 当前均为 `healthy`。

## Nginx

- 发现 `web/api` 重建后，`nginx` 仍持有旧 upstream IP，导致外部请求返回 `502 Bad Gateway`。
- 已执行 `docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx`，问题恢复。

## HTTPS

- `https://toolsdar.io`
- `https://api.toolsdar.io`
- 重启 `nginx` 后 HTTPS 访问恢复正常。

## API

- `https://api.toolsdar.io/v1/health` 返回 `status=ok`
- `https://api.toolsdar.io/v1/search?q=chatgpt&pageSize=3` 已返回 `logoUrl`
- `https://api.toolsdar.io/v1/recommendations/home?limit=3` 已返回 `logoUrl`
- `https://api.toolsdar.io/v1/tools/chatgpt/related?limit=3` 已返回 `logoUrl`

## Web

- 首页、搜索页、详情页均已重新部署。
- 工具列表相关链路已统一通过 `logoUrl` 输出，并在缺失时回退到网站 favicon。
- `ToolLogo` 已支持：
  - 相对地址解析
  - 图片失败 fallback
  - 首字母占位
  - 分类图标兜底

## Search

- 搜索接口返回结果已包含统一的 `logoUrl`。
- 搜索推荐、首页推荐、相关工具链路已统一补齐 logo 映射。

## 数据库

- 只读验收结果：
  - `tools total = 50`
  - `status PUBLISHED = 50`
  - `tools without category = 0`
- 之前只读排查已确认：
  - `logo_count = 0`
  - `summary_count = 50`
  - `description_count = 50`

## Meilisearch

- 当前生产 Compose 中 `meilisearch` 为 `healthy`。
- 搜索接口已正常返回结果。

## 修复内容

- 新增前台统一 logo 解析工具：
  - `apps/web/src/lib/tool-logo.ts`
- 修复前台 logo 展示：
  - 首页卡片
  - 搜索结果页
  - 工具列表/分类列表/详情推荐链路
- 统一 API/搜索返回 `logoUrl`：
  - `packages/public-api/src/handlers.ts`
  - `apps/api/src/search/search.service.ts`
  - `packages/search/src/*`
- 新增安全生产 seed 脚本：
  - `scripts/seed-production-tools.ts`
  - 默认 `dry-run`
  - 仅 `--apply` 才写库
- 修复根脚本入口：
  - `package.json` -> `seed:tools`
- 修复部署构建稳定性：
  - `docker/Dockerfile.node`

## 存在的问题

- 生产宿主机不是完整开发环境，缺少直接运行 `pnpm/tsx/Prisma client` 的条件。
- 在生产 `api` 容器内执行自定义 `seed` 脚本 dry-run，会被安全策略判定为“潜在写库操作”。
- 因此，`seed-production-tools.ts` 已完成开发与本地编译验证，但生产 dry-run / apply 需要显式授权后再执行。

## 建议执行命令

```bash
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm build
pnpm seed:tools
pnpm seed:tools -- --apply
```

## 最终访问地址

- Web: `https://toolsdar.io/en`
- Search: `https://toolsdar.io/en/search?q=chatgpt`
- Tool detail: `https://toolsdar.io/en/tools/chatgpt`
- API health: `https://api.toolsdar.io/v1/health`
- API search: `https://api.toolsdar.io/v1/search?q=chatgpt&pageSize=3`
