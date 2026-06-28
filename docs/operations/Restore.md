# 恢复指南

## PostgreSQL 恢复

```bash
# 1. 停止写入（维护模式或 scale API to 0）
kubectl scale deployment/ai-tool-cms-api --replicas=0

# 2. 恢复
gunzip -c backups/postgres/latest.sql.gz | psql $DATABASE_URL

# 或使用脚本
./scripts/backup/restore-postgres.sh backups/postgres/latest.sql.gz

# 3. 验证
psql $DATABASE_URL -c "SELECT count(*) FROM \"Tool\";"

# 4. 恢复服务
kubectl scale deployment/ai-tool-cms-api --replicas=2
curl -f $API_URL/v1/health/ready
```

## Redis 恢复

Redis 为缓存层，通常 **无需恢复**。清空后 cache-aside 自动重建：

```bash
redis-cli -u $REDIS_URL FLUSHDB
```

## 完整灾难恢复 (DR)

1. 在新区域启动基础设施（Postgres、Redis、Meilisearch）
2. 恢复 PostgreSQL 最新备份
3. 更新 `DATABASE_URL` / `REDIS_URL`
4. `pnpm db:migrate:deploy`（确保 schema 最新）
5. 重建 Meilisearch 索引：`POST /v1/search/reindex`
6. 验证健康检查与 smoke test

## 恢复演练

**频率：** GA 后 7 日内首次；之后每季度。

**记录：** 演练日期、RTO、RPO、发现问题。

## RTO / RPO 目标

| 指标 | 目标 |
|------|------|
| RPO | ≤ 15 分钟（备份间隔） |
| RTO | ≤ 1 小时 |
