# Healthcheck Matrix

## 目标

这份文档用于统一说明生产环境中各服务的：

- 健康检查地址
- 健康检查目的
- 依赖关系
- 常见误判原因

避免出现“服务已经起来，但被 Compose 判定为 unhealthy”的情况。

## 服务矩阵

### postgres

- Healthcheck:
  - `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`
- 目的：
  - 确认数据库实例已接受连接
- 常见问题：
  - 首次启动初始化未完成

### redis

- Healthcheck:
  - `redis-cli -a ${REDIS_PASSWORD} ping | grep PONG`
- 目的：
  - 确认 Redis 已接受认证并返回 `PONG`
- 常见问题：
  - 密码不一致

### meilisearch

- Healthcheck:
  - `http://127.0.0.1:7700/health`
- 目的：
  - 确认搜索服务已对本地 HTTP 请求可用
- 常见问题：
  - 启动初期索引或数据目录尚未准备好

### minio

- Healthcheck:
  - `http://127.0.0.1:9000/minio/health/live`
- 目的：
  - 确认对象存储服务可用

### api

- Healthcheck:
  - `http://127.0.0.1:4000/v1/health/ready`
- 目的：
  - 检查 Nest 服务已启动
  - 同时确认数据库与 Redis 就绪
- 依赖：
  - `postgres`
  - `redis`
  - `meilisearch`
  - `minio`
  - `search-bootstrap`
- 推荐参数：
  - `interval: 15s`
  - `timeout: 5s`
  - `retries: 10`
  - `start_period: 20s`
- 常见误判原因：
  - 应用启动慢于 healthcheck 首轮开始时间
  - 数据库或 Redis 未完全 ready

### web

- Healthcheck:
  - `http://127.0.0.1:3000`
- 目的：
  - 检查 Next.js standalone 服务已对根路径响应
- 依赖：
  - `api`
- 推荐参数：
  - `interval: 15s`
  - `timeout: 5s`
  - `retries: 10`
  - `start_period: 30s`
- 常见误判原因：
  - Next.js 初次启动慢
  - 构建产物与运行时环境不一致

### admin

- Healthcheck:
  - `http://127.0.0.1:3000/`
- 目的：
  - 检查 Admin 的 Next.js 服务对根路径响应
- 依赖：
  - `api`
- 推荐参数：
  - `interval: 15s`
  - `timeout: 5s`
  - `retries: 10`
  - `start_period: 30s`
- 常见误判原因：
  - `ADMIN_BASE_PATH` 与反代配置不一致
  - healthcheck 检查了错误路径，例如曾经错误检查 `/admin`

### nginx

- Healthcheck:
  - `nginx -t && pgrep nginx >/dev/null || exit 1`
- 目的：
  - 确认 nginx 配置语法正确且主进程存在
- 依赖：
  - `web`
  - `admin`
  - `api`
- 常见误判原因：
  - 上游服务不健康
  - 挂载的 `production.conf` 或证书路径有误

## 当前建议

生产环境中，以下服务建议始终带 `start_period`：

- `api`
- `web`
- `admin`
- `meilisearch`
- `nginx`

其中 `meilisearch` 和 `nginx` 已经较适合当前启动节奏，`api/web/admin` 则需要重点避免“过早探测”。

## 依赖链建议

当前推荐依赖顺序：

1. `postgres` / `redis` / `meilisearch` / `minio`
2. `postgres-bootstrap`
3. `migrate`
4. `search-bootstrap`
5. `api`
6. `web` / `admin`
7. `nginx`

## 排查顺序

当 `nginx` 不健康时：

1. 先看 `web`
2. 再看 `admin`
3. 再看 `api`
4. 最后才看 nginx 本身

当 `web/admin` 不健康时：

1. 先看容器日志
2. 再确认 healthcheck 路径
3. 再确认依赖的 `api` 是否健康

## 相关文档

- [Runbook.md](./Runbook.md)
- [BuildFailureRootCauseAndFixPlan.md](./BuildFailureRootCauseAndFixPlan.md)
- [ServerReleaseConsistencyChecklist.md](./ServerReleaseConsistencyChecklist.md)
