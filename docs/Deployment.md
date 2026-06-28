# 部署指南

生产部署 AI Tool CMS v1.0.0 的推荐路径与检查清单。

## 架构建议

```
Internet → CDN → Nginx → Web / Admin (Next.js)
                      → API (NestJS)
                      → Worker / Scheduler
         PostgreSQL · Redis · Meilisearch · S3
```

## 部署前检查

- [ ] `docs/12-release/ReleaseReview.md` 签署
- [ ] `docs/operations/GoLiveChecklist` 完成
- [ ] 环境变量已配置（无默认值密钥）
- [ ] `pnpm db:migrate:deploy` 在 staging 验证
- [ ] 备份 cron 已配置

## Docker 生产镜像

```bash
# API
docker build --build-arg APP_NAME=api -f docker/Dockerfile \
  -t ghcr.io/zhshg/ai-tool-cms:1.0.0 .

docker push ghcr.io/zhshg/ai-tool-cms:1.0.0
```

## 健康检查

| Probe | Path | 用途 |
|-------|------|------|
| Liveness | `/v1/health/live` | 进程存活 |
| Readiness | `/v1/health/ready` | DB + Redis 就绪 |
| Metrics | `/v1/health/metrics` | Prometheus |

## CI/CD

GitHub Actions：`.github/workflows/ci.yml`（测试）· `deploy.yml`（部署）

## 零停机升级

见 [operations/Upgrade.md](./operations/Upgrade.md)

## 回滚

见 [operations/Rollback.md](./operations/Rollback.md)

## 监控

- Prometheus scrape `/v1/health/metrics`
- 可选：OTEL → Jaeger，Sentry DSN

## Nginx

参考 `docker/nginx/conf.d/default.conf` 配置反向代理与 SSL。

## 相关

- [Installation.md](./Installation.md)
- [operations/Runbook.md](./operations/Runbook.md)
