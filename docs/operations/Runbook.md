# 运维 Runbook

## 适用范围

本手册用于 `toolsdar.io / ai-tool-cms` 生产环境的日常巡检、重建、验收与故障初查。

生产目录默认约定：

- 项目目录：`/opt/ai-tool-cms`
- 环境文件：`/opt/ai-tool-cms/.env.production`
- Compose 文件：`/opt/ai-tool-cms/docker-compose.prod.yml`
- 持久化目录：`/opt/ai-tool-cms/storage`

## 日常巡检

建议每日检查以下项目：

1. `docker compose ps` 是否全部正常
2. `https://api.toolsdar.io/v1/health` 是否返回 `200`
3. `https://toolsdar.io/en` 是否返回 `200`
4. `https://admins.toolsdar.io/` 是否可访问
5. 最近一次构建日志中是否存在连续失败

推荐命令：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://api.toolsdar.io/v1/health
curl -I https://toolsdar.io/en
curl -I https://admins.toolsdar.io/
```

## Auto Update 与 Crawler

`tools:auto-update` 与 `crawler:run` 的新产物路径已经统一到 `storage/auto-update`。

宿主机路径：

- 快照：`/opt/ai-tool-cms/storage/auto-update/candidates/auto-update-<run-id>.json`
- 报告：`/opt/ai-tool-cms/storage/auto-update/reports/auto-update-<run-id>.md`
- 日志：`/opt/ai-tool-cms/storage/auto-update/logs/<run-id>.log`

容器内路径：

- 快照：`/app/storage/auto-update/candidates/auto-update-<run-id>.json`
- 报告：`/app/storage/auto-update/reports/auto-update-<run-id>.md`
- 日志：`/app/storage/auto-update/logs/<run-id>.log`

注意：

1. 新的生产报告不要再去 `docs/operations/reports/` 里找。
2. 新的生产日志不要再去 `logs/auto-update/` 里找。
3. 仓库中的 `docs/operations/reports/*` 仅保留历史样例，不代表当前生产落盘目录。

推荐命令：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'cd /app && pnpm run tools:auto-update -- --mode=manual-review --limit=10'
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'cd /app && pnpm crawler:run --source futurepedia --limit 20 --dry-run'
ls -lh storage/auto-update/candidates | tail
ls -lh storage/auto-update/reports | tail
ls -lh storage/auto-update/logs | tail
```

## 标准重建原则

生产环境重建时遵循以下原则：

1. 优先单服务重建，不要无差别全量 `up --build`
2. 优先后台构建并写日志，不要长时间前台占用 SSH
3. 先确认改动影响范围，再决定重建 `web`、`admin`、`api`
4. 数据库、Redis、MinIO、Meilisearch 默认不重建
5. 重建失败先看 build log，不要反复盲试

## 标准重建命令

### 只改前台页面

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build web
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps web nginx
```

### 只改后台页面

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build admin
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate admin nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps admin nginx
```

### 只改 API

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build api
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api
docker compose --env-file .env.production -f docker-compose.prod.yml ps api
```

如果 API 变更会影响前台或后台，再执行：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web admin nginx
```

## 推荐后台构建方式

当 SSH 连接容易中断时，优先使用后台构建。

### web

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-web-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build web > /tmp/toolsdar-web-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-web-build.log
```

### admin

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-admin-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build admin > /tmp/toolsdar-admin-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-admin-build.log
```

### api

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-api-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build api > /tmp/toolsdar-api-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-api-build.log
```

## 常见故障判断

### 1. `pnpm install` 失败

优先判断：

- 是否走到了依赖重新下载
- 是否出现 `EAI_AGAIN`
- 是否 Docker cache 没命中

处理方向：

1. 先看 Dockerfile 依赖层是否被缓存
2. 再看服务器出网是否抖动
3. 不要立刻怀疑业务代码

### 2. `web build` 失败

优先判断：

- 是否是 TypeScript 报错
- 是否是未使用声明
- 是否是 Prisma 查询类型不兼容

处理方向：

1. 先从 `/tmp/toolsdar-web-build.log` 提取 `Type error`
2. 修掉具体报错后再重建
3. 不要同时改动过多文件

### 3. `admin` 容器 `unhealthy`

优先判断：

- 应用是否实际上已经启动
- healthcheck 路径是否和真实访问路径一致
- `ADMIN_BASE_PATH` 是否与 nginx 反代一致

### 4. `nginx` 启动失败

优先判断：

- `web/admin/api` 是否健康
- 证书挂载是否存在
- `production.conf` 是否语法正确

多数情况下，`nginx` 不是首要根因。

## 验收清单

### web 发布后

```bash
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/en/categories
curl -I https://toolsdar.io/sitemaps/en.xml
```

### admin 发布后

```bash
curl -I https://admins.toolsdar.io/
curl -I https://admins.toolsdar.io/login
```

### api 发布后

```bash
curl -I https://api.toolsdar.io/v1/health
curl -I https://api.toolsdar.io/v1/health/ready
```

## 相关文档

- [BuildFailureRootCauseAndFixPlan.md](./BuildFailureRootCauseAndFixPlan.md)
- [CleanReleaseDeployment.md](./CleanReleaseDeployment.md)
- [Rollback.md](./Rollback.md)
- [ServerCleanupAndRollback.md](./ServerCleanupAndRollback.md)
