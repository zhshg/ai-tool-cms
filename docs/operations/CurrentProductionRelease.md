# Current Production Release

## 当前线上状态

- 前台首页正常
- 工具列表正常
- `sitemap.xml` 正常
- API 健康检查正常
- Admin 正常
- 所有生产容器为 `healthy`
- Google Analytics 已生效

## 当前生效目录

- 发布目录：`/opt/ai-tool-cms-release-20260706-133700`
- Compose 项目名：`ai-tool-cms`
- 原始生产目录：`/opt/ai-tool-cms`

## 关键提交

- `025d2d7`
  - 稳定 Docker 构建依赖下载
- `749dbce`
  - 接入生产 `NEXT_PUBLIC_GA_ID`
- `c1cfff9`
  - 新增干净发布部署文档
- `3fbf6ab`
  - 新增服务器清理与回滚文档

## 本次上线要点

- 未直接覆盖服务器原目录脏工作区
- 使用 GitHub 提交归档创建干净发布目录
- 构建阶段切换为更稳定的 `pnpm` registry 策略
- 已确认页面输出 `googletagmanager.com/gtag/js`
- 已确认页面输出 `G-V59J3MRC1P`

## 快速验证

```bash
cd /opt/ai-tool-cms-release-20260706-133700
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/sitemap.xml
curl -I https://api.toolsdar.io/v1/health
curl -I https://admins.toolsdar.io/admin
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml exec -T web sh -lc 'printenv | grep NEXT_PUBLIC_GA_ID'
curl -s https://toolsdar.io/en | grep -o 'G-V59J3MRC1P\|googletagmanager.com/gtag/js'
```

## 相关文档

- [CleanReleaseDeployment.md](./CleanReleaseDeployment.md)
- [ServerCleanupAndRollback.md](./ServerCleanupAndRollback.md)
