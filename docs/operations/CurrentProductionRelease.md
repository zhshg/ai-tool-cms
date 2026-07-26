# Current Production Release

## 当前线上状态

当前生产环境的目标状态应至少满足以下条件：

- 前台首页可访问
- 工具列表页可访问
- 分类页可访问
- `sitemap` 可访问
- API 健康检查可访问
- Admin 可访问
- 关键容器均为 `healthy`

## 当前生产目录约定

- 主目录：`/opt/ai-tool-cms`
- 环境文件：`/opt/ai-tool-cms/.env.production`
- Compose 文件：`/opt/ai-tool-cms/docker-compose.prod.yml`
- 存储目录：`/opt/ai-tool-cms/storage`

如果使用干净发布目录流程，则额外存在：

- release 目录：`/opt/ai-tool-cms-release-YYYYMMDD-HHMMSS`

## 当前生产镜像检查

推荐上线后记录以下镜像：

```bash
docker images | grep ai-tool-cms-web
docker images | grep ai-tool-cms-admin
docker images | grep ai-tool-cms-api
```

## 当前关键访问地址

- Web: `https://toolsdar.io/en`
- Tools: `https://toolsdar.io/en/tools`
- Categories: `https://toolsdar.io/en/categories`
- Sitemap: `https://toolsdar.io/sitemaps/en.xml`
- API Health: `https://api.toolsdar.io/v1/health`
- Admin: `https://admins.toolsdar.io/`

## 快速验收命令

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/en/categories
curl -I https://toolsdar.io/sitemaps/en.xml
curl -I https://api.toolsdar.io/v1/health
curl -I https://admins.toolsdar.io/
```

## 当前运维基线

当前生产发布与重建应遵循以下基线：

1. 单服务构建优先
2. 后台日志构建优先
3. 不直接动数据库卷
4. 不把 `.env.production` 提交到 Git
5. 先确认目录一致性，再重建服务

## 相关文档

- [Runbook.md](./Runbook.md)
- [CleanReleaseDeployment.md](./CleanReleaseDeployment.md)
- [Rollback.md](./Rollback.md)
- [BuildFailureRootCauseAndFixPlan.md](./BuildFailureRootCauseAndFixPlan.md)
