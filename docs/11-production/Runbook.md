# Runbook

## 适用范围

本手册覆盖 `toolsdar.io / ai-tool-cms` 生产环境的日常巡检、重建、验收与首轮故障排查流程。

生产环境默认约定：

- Project root: `/opt/ai-tool-cms`
- Env file: `/opt/ai-tool-cms/.env.production`
- Compose file: `/opt/ai-tool-cms/docker-compose.prod.yml`
- Persistent storage root: `/opt/ai-tool-cms/storage`

## 日常巡检

建议每日检查：

1. `docker compose ps` 是否健康
2. `https://api.toolsdar.io/v1/health` 是否返回 `200`
3. `https://toolsdar.io/en` 是否返回 `200`
4. `https://admins.toolsdar.io/` 是否可访问
5. 最近一次构建日志里是否存在连续失败

推荐命令：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://api.toolsdar.io/v1/health
curl -I https://toolsdar.io/en
curl -I https://admins.toolsdar.io/
```

## Crawler 与 Auto Update

`tools:auto-update` 与 `crawler:run` 的新产物现在统一持久化到 `storage/auto-update`。

宿主机路径：

- 候选快照：`/opt/ai-tool-cms/storage/auto-update/candidates/auto-update-<run-id>.json`
- Markdown 报告：`/opt/ai-tool-cms/storage/auto-update/reports/auto-update-<run-id>.md`
- 运行日志：`/opt/ai-tool-cms/storage/auto-update/logs/<run-id>.log`

容器内路径：

- 候选快照：`/app/storage/auto-update/candidates/auto-update-<run-id>.json`
- Markdown 报告：`/app/storage/auto-update/reports/auto-update-<run-id>.md`
- 运行日志：`/app/storage/auto-update/logs/<run-id>.log`

注意：

- 新的生产报告不要再去 `/opt/ai-tool-cms/docs/operations/reports` 里找。
- 新的生产日志不要再去 `/opt/ai-tool-cms/logs/auto-update` 里找。
- `docs/operations/reports/*` 仅保留仓库中的历史样例。

### 生产命令

`tools:auto-update` dry-run：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'cd /app && pnpm run tools:auto-update -- --mode=manual-review --limit=10'
```

`crawler:run` dry-run：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'cd /app && pnpm crawler:run --source futurepedia --limit 20 --dry-run'
```

### 产物校验

任意一次运行后，都应优先在宿主机上校验产物：

```bash
cd /opt/ai-tool-cms
ls -lh storage/auto-update/candidates | tail
ls -lh storage/auto-update/reports | tail
ls -lh storage/auto-update/logs | tail
```

如需进入容器内核对：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'ls -lh /app/storage/auto-update/candidates /app/storage/auto-update/reports /app/storage/auto-update/logs'
```

## 标准重建原则

生产环境重建时遵循以下原则：

1. 优先单服务重建，不要直接使用全量 `up --build`
2. 优先后台构建并写日志，不要长时间占用交互式 SSH 会话
3. 先确认影响范围，再决定重建 `web`、`admin` 或 `api`
4. 非必要不要重建 Postgres、Redis、MinIO、Meilisearch
5. 构建失败先看 build log，不要靠猜

## 标准重建命令

### 只改 Web

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build web
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps web nginx
```

### 只改 Admin

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

如果 API 变更同时影响前台或后台，再执行：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web admin nginx
```

## 后台构建模式

当 SSH 会话容易中断时，优先使用后台构建。

### Web

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-web-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build web > /tmp/toolsdar-web-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-web-build.log
```

### Admin

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-admin-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build admin > /tmp/toolsdar-admin-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-admin-build.log
```

### API

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-api-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build api > /tmp/toolsdar-api-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-api-build.log
```

## 常见故障排查

### `pnpm install` 失败

优先判断：

- 是否走到了依赖重新下载
- 是否出现 `EAI_AGAIN`
- 是否 Docker cache 没命中

处理方向：

1. 先看依赖层本应是否可命中缓存
2. 再看服务器出网是否抖动
3. 不要第一时间怀疑业务代码

### `web build` 失败

优先判断：

- 是否为 TypeScript 报错
- 是否为导出或类型不匹配
- 是否为 Prisma 查询类型不兼容

处理方向：

1. 先从构建日志里提取具体 `Type error`
2. 修掉明确报错后再重建
3. 不要一次同时改动太多文件

### `admin` 容器 `unhealthy`

优先判断：

- 应用是否实际上已经启动
- healthcheck 路径是否与真实路由一致
- `ADMIN_BASE_PATH` 是否与 nginx 反代一致

### `nginx` 启动失败

优先判断：

- `web/admin/api` 是否健康
- 证书挂载是否存在
- `production.conf` 是否语法正确

多数情况下，`nginx` 不是首要根因。

## 验收清单

### Web 发布后

```bash
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/en/categories
curl -I https://toolsdar.io/sitemaps/en.xml
```

### Admin 发布后

```bash
curl -I https://admins.toolsdar.io/
curl -I https://admins.toolsdar.io/login
```

### API 发布后

```bash
curl -I https://api.toolsdar.io/v1/health
curl -I https://api.toolsdar.io/v1/health/ready
```

## 相关文档

- [BuildFailureRootCauseAndFixPlan.md](./BuildFailureRootCauseAndFixPlan.md)
- [CleanReleaseDeployment.md](./CleanReleaseDeployment.md)
- [Rollback.md](./Rollback.md)
- [ServerCleanupAndRollback.md](./ServerCleanupAndRollback.md)
