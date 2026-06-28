# 备份指南

## 自动备份

### PostgreSQL

```bash
# Cron 示例（每 15 分钟）
*/15 * * * * cd /app && pnpm backup:postgres
```

脚本：`scripts/backup/backup-postgres.sh`

输出目录：`backups/postgres/`

### Redis

```bash
bash scripts/backup/backup-redis.sh
```

### 验证备份

```bash
pnpm backup:verify
```

## 备份内容

| 组件 | 方法 | 保留策略 |
|------|------|----------|
| PostgreSQL | pg_dump + gzip | 7 天本地 + 30 天对象存储 |
| Redis | RDB snapshot | 24h |
| 上传文件 | S3 sync | 版本控制 |

## 对象存储

配置 `STORAGE_*` 环境变量。定期同步 `STORAGE_BUCKET` 至异地。

## 检查清单

- [ ] 备份 cron 已配置
- [ ] 备份文件可解压
- [ ] 恢复演练每季度一次（见 [Restore.md](./Restore.md)）
- [ ] 告警：备份失败通知 on-call

## 手动备份

```bash
export DATABASE_URL=postgresql://...
./scripts/backup/backup-postgres.sh
ls -la backups/postgres/
```
