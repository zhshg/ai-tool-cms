# RC4 Deployment Report

## 概览

- 项目：`ai-tool-cms`
- 分支：`feature/product-home`
- 服务器：`154.48.226.152`
- 验收日期：`2026-07-06`

## Docker

- 生产环境使用 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`
- `web`、`admin`、`api`、`nginx`、`postgres`、`redis`、`minio`、`meilisearch` 已纳入生产 Compose
- 未修改数据库 volume，保留现有生产数据卷

## Nginx

- 已暴露 `80` 和 `443`
- 已挂载生产证书目录 `/etc/letsencrypt`
- 已挂载生产配置 `docker/nginx/conf.d/production.conf`
- 已挂载 `storage`
- `admins.toolsdar.io` 已调整为根路径直接反代后台，不再附加 `/admin`

## HTTPS

- 已启用并验证以下域名证书配置：
- `https://toolsdar.io`
- `https://www.toolsdar.io`
- `https://admins.toolsdar.io`
- `https://api.toolsdar.io`
- `https://img.toolsdar.io`
- 证书路径：
- `/etc/letsencrypt/live/toolsdar.io/fullchain.pem`
- `/etc/letsencrypt/live/toolsdar.io/privkey.pem`

## 数据库

- 生产库只读核验结果：
- `tools total = 50`
- `published = 50`
- `draft = 0`
- `archived = 0`
- `tools without category = 0`
- `suspectedFake = 0`

## Search / Meilisearch

- `Meilisearch` 健康检查已修复为稳定配置
- 搜索接口可正常返回结果
- 首页推荐、搜索结果、相关工具链路已确认返回 `logoUrl`

## Admin

- 后台已切换为独立域名根路径访问：
- `https://admins.toolsdar.io`
- 已修复后台错误 logo 路径，改为主站可访问资源
- 已修复工具编辑页预览链接：
- 优先使用当前 `slug`
- 若未填写 `slug`，根据当前 `name` 动态生成预览路径
- 预览始终指向主站域名，而不是后台域名

## Web

- 首页、工具列表、搜索页、详情页可正常访问
- 工具卡片统一读取 `logoUrl`
- 保留图片失败 fallback 逻辑

## API

- `https://api.toolsdar.io/v1/health` 返回正常
- `https://api.toolsdar.io/v1/search?q=chatgpt&pageSize=3` 返回正常
- `https://api.toolsdar.io/v1/recommendations/home?limit=3` 返回正常
- `https://api.toolsdar.io/v1/tools/chatgpt/related?limit=3` 返回正常

## 修复内容

- 修复生产 Compose、Nginx、HTTPS、healthcheck 配置
- 修复后台 `/admin` 重复路径问题
- 修复后台 logo 资源地址错误
- 修复工具编辑页预览地址错误，改为主站动态预览
- 修复生产环境中 admin 容器和 nginx 对 `/admin` 子路径的历史依赖

## 存在的问题

- 本地 `pnpm` 类型检查受依赖校验和网络拉取影响，未在本轮拿到完整编译结果
- 线上最终生效仍需重建并重启 `admin` 与 `nginx` 容器

## 简洁验收说明

- `admins.toolsdar.io` 应直接打开后台首页，不应再出现 `/admin/admin` 或自动多一层 `/admin`
- 后台侧边栏 logo 应显示正确品牌图
- 工具编辑页点击 `Preview` 应跳转到 `https://toolsdar.io/en/tools/...`
- 已存在 `slug` 时预览应稳定命中详情页
- 未填写 `slug` 时预览地址应随当前工具名称实时变化

## 最终访问地址

- Web：`https://toolsdar.io/en`
- Search：`https://toolsdar.io/en/search?q=chatgpt`
- Tool detail：`https://toolsdar.io/en/tools/chatgpt`
- Admin：`https://admins.toolsdar.io`
- API health：`https://api.toolsdar.io/v1/health`
- Image host：`https://img.toolsdar.io`
