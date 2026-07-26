# Rollback

## 目标

当新版本发布后出现访问异常、构建异常、页面错误或健康检查失败时，快速回退到上一稳定状态，同时避免误伤数据库与对象存储。

## 回滚原则

1. 优先回滚应用服务，不先动数据库
2. 先回滚最小影响范围服务
3. 先确认旧镜像或旧 release 目录仍可用
4. 回滚后必须重新验收公开 URL

## 应用回滚

### 1. 使用旧镜像回滚

先查看镜像：

```bash
docker images | grep ai-tool-cms-web
docker images | grep ai-tool-cms-admin
docker images | grep ai-tool-cms-api
```

如果旧镜像仍在，可按服务回滚。

### 2. 只回滚 web

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps web nginx
```

### 3. 只回滚 admin

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate admin nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps admin nginx
```

### 4. 只回滚 api

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api
docker compose --env-file .env.production -f docker-compose.prod.yml ps api
```

如果 API 影响前后台，再补：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web admin nginx
```

## 基于旧 release 目录回滚

如果使用的是干净发布目录方式，可直接切回旧目录：

```bash
cd /opt/ai-tool-cms-release-OLD
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web admin api nginx
```

## 数据库回滚

默认不建议把数据库作为第一步回滚手段。

仅在以下情况考虑：

1. 已确认问题由迁移引起
2. 已确认有可恢复备份
3. 已明确恢复窗口和影响范围

相关流程参考：

- [Backup.md](./Backup.md)
- [Restore.md](./Restore.md)

## 回滚后验收

### web

```bash
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/en/categories
curl -I https://toolsdar.io/sitemaps/en.xml
```

### admin

```bash
curl -I https://admins.toolsdar.io/
curl -I https://admins.toolsdar.io/login
```

### api

```bash
curl -I https://api.toolsdar.io/v1/health
curl -I https://api.toolsdar.io/v1/health/ready
```

## 回滚判断顺序

1. 页面异常但 API 正常
   - 先回滚 `web`
2. 后台异常但前台正常
   - 先回滚 `admin`
3. API 健康检查失败
   - 先回滚 `api`
4. `nginx` 报错
   - 先检查 `web/admin/api` 是否健康

## 相关文档

- [BuildFailureRootCauseAndFixPlan.md](./BuildFailureRootCauseAndFixPlan.md)
- [CleanReleaseDeployment.md](./CleanReleaseDeployment.md)
- [ServerCleanupAndRollback.md](./ServerCleanupAndRollback.md)
