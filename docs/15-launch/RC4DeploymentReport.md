# RC4 Deployment Report

## 概览

- 项目：`ai-tool-cms`
- 分支：`feature/product-home`
- 服务器：`154.48.226.152`
- 验收日期：`2026-07-06`

## Docker

- 已修复生产构建与容器启动链路，当前 `web`、`api`、`nginx` 均可正常运行。
- 生产环境使用 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` 启动。
- 本轮未修改数据库 volume，现有数据卷保持不变。

## Nginx

- 已确认 `nginx` 暴露 `80` 与 `443`。
- 已挂载生产配置、`storage` 与 Let's Encrypt 证书目录。
- 已修复 `web/api` 重建后 `nginx` 持有旧 upstream IP 导致的 `502 Bad Gateway` 问题，重启 `nginx` 后恢复正常。

## HTTPS

- 已启用并验证以下地址：
  - `https://toolsdar.io`
  - `https://www.toolsdar.io`
  - `https://admins.toolsdar.io`
  - `https://api.toolsdar.io`
  - `https://img.toolsdar.io`
- 证书路径：
  - `/etc/letsencrypt/live/toolsdar.io/fullchain.pem`
  - `/etc/letsencrypt/live/toolsdar.io/privkey.pem`

## API

- `https://api.toolsdar.io/v1/health` 返回正常。
- `https://api.toolsdar.io/v1/search?q=chatgpt&pageSize=3` 已返回 `logoUrl`。
- `https://api.toolsdar.io/v1/recommendations/home?limit=3` 已返回 `logoUrl`。
- `https://api.toolsdar.io/v1/tools/chatgpt/related?limit=3` 已返回 `logoUrl`。

## Web

- 首页、搜索页、工具详情页均已恢复访问。
- 前台工具卡片统一读取 `logoUrl`，并保留 fallback 逻辑。
- 工具列表、首页推荐、搜索结果、相关工具链路均已统一 logo 字段输出。

## Search

- 搜索服务当前可正常返回结果。
- `Meilisearch` 健康检查已修复为稳定可用配置，生产环境搜索链路正常。

## 数据库

- 生产库只读验收结果：
  - `tools total = 50`
  - `published = 50`
  - `tools without category = 0`
- 受限 apply 后只读复核结果：
  - `with_logo = 50`
  - 本次仅补全空 `logoUrl`

## Meilisearch

- 当前生产环境 `Meilisearch` 可正常响应。
- 搜索接口已通过线上只读验收。

## 修复内容

- 修复生产 Compose、Nginx、HTTPS 与健康检查配置。
- 修复前台与 API 的工具 logo 字段统一输出与显示。
- 新增生产安全种子脚本：
  - `scripts/seed-production-tools.ts`
  - 默认 `dry-run`
  - 仅显式传入 `--apply` 才写库
- 新增受限保护参数：
  - `--only=logoUrl`
  - `--only-empty`
- 已完成一次受限生产 apply：
  - 只更新空 `logoUrl`
  - 不覆盖已有非空值
  - 不创建、不删除、不归档工具
  - 不修改 `name`、`slug`、`websiteUrl`、`description`、`category`、`status`、`pricingType`

## 存在的问题

- 生产宿主机不适合作为完整开发环境，脚本执行依赖容器内现有运行时。
- 生产库操作必须继续保持显式授权与受限参数保护，避免误写入非目标字段。

## 上线验收说明

- 线上 `502` 已修复，首页、搜索页、详情页均返回 `HTTP 200`。
- `search`、`home recommendations`、`related tools` API 已确认返回 `logoUrl`。
- 生产库 50 条已发布工具当前全部具备非空 `logoUrl`。
- `suspectedFake=0`，此前 41 条为旧规则误判，现已排除。
- 本次生产写入范围仅为补全空 `logoUrl`，未改动其他业务字段与生产数据结构。

## 建议执行命令

```bash
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm build
pnpm seed:tools
pnpm seed:tools -- --apply --only=logoUrl --only-empty
```

## 最终访问地址

- Web: `https://toolsdar.io/en`
- Search: `https://toolsdar.io/en/search?q=chatgpt`
- Tool detail: `https://toolsdar.io/en/tools/chatgpt`
- API health: `https://api.toolsdar.io/v1/health`
- API search: `https://api.toolsdar.io/v1/search?q=chatgpt&pageSize=3`
