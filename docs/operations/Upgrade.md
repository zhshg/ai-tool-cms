# 升级指南

**目标：** 零停机升级至新版本。

## 升级前

- [ ] 阅读 [CHANGELOG.md](../../CHANGELOG.md) 与 [RELEASE.md](../../RELEASE.md)
- [ ] Staging 验证通过
- [ ] 备份完成（[Backup.md](./Backup.md)）
- [ ] 通知用户维护窗口（如需要）

## 标准升级流程

```bash
# 1. 拉取镜像
docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0

# 2. 数据库迁移（先于应用滚动）
pnpm db:migrate:deploy

# 3. 滚动更新 API
kubectl set image deployment/ai-tool-cms-api \
  api=ghcr.io/zhshg/ai-tool-cms:1.0.0
kubectl rollout status deployment/ai-tool-cms-api

# 4. 更新 Worker / Web / Admin
kubectl set image deployment/ai-tool-cms-worker worker=ghcr.io/zhshg/ai-tool-cms:1.0.0
kubectl set image deployment/ai-tool-cms-web web=ghcr.io/zhshg/ai-tool-cms:1.0.0

# 5. 验证
curl -f $API_URL/v1/health/ready
pnpm test:e2e  # 对 staging/production smoke
```

## 数据库迁移注意

- **向后兼容迁移** — 先部署能容忍新旧 schema 的版本
- **破坏性迁移** — 分两阶段：expand → contract

## 功能开关

使用 `@ai-tool-cms/feature-flags` 灰度新功能，降低升级风险。

## 升级后

- [ ] 监控 72h
- [ ] SEO 日报正常
- [ ] 队列无异常积压

## 失败处理

见 [Rollback.md](./Rollback.md)
