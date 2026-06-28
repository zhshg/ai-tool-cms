# 回滚指南

当升级导致问题时，快速回滚至上一稳定版本。

## 应用回滚（Kubernetes）

```bash
# 查看历史
kubectl rollout history deployment/ai-tool-cms-api

# 回滚至上一版本
kubectl rollout undo deployment/ai-tool-cms-api
kubectl rollout status deployment/ai-tool-cms-api

# 回滚至指定 revision
kubectl rollout undo deployment/ai-tool-cms-api --to-revision=3
```

## Docker 单容器

```bash
docker stop ai-tool-cms-api
docker run -d --name ai-tool-cms-api ghcr.io/zhshg/ai-tool-cms:0.9.0
```

## 数据库回滚

⚠️ **谨慎：** 仅当迁移可逆或已有备份时执行。

```bash
# 1. 停止应用写入
kubectl scale deployment/ai-tool-cms-api --replicas=0

# 2. 恢复备份（见 Restore.md）
./scripts/backup/restore-postgres.sh backups/postgres/pre-upgrade.sql.gz

# 3. 重启应用（旧版本镜像）
kubectl set image deployment/ai-tool-cms-api api=ghcr.io/zhshg/ai-tool-cms:0.9.0
kubectl scale deployment/ai-tool-cms-api --replicas=2
```

## 回滚决策树

```
问题是否由代码引起？
  ├─ 是 → kubectl rollout undo
  └─ 否 → 是否由迁移引起？
         ├─ 是 → 恢复 DB 备份 + 旧镜像
         └─ 否 → 检查基础设施 / 配置
```

## 回滚后验证

```bash
curl -f $API_URL/v1/health/ready
# Smoke test 关键路径：首页、搜索、工具详情
```

## 沟通

在状态页标注「已回滚至 vX.Y.Z」，72h 内完成 Postmortem。
