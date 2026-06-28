# 运维 Runbook

**版本：** 1.0.0 GA  
**受众：** 值班工程师、SRE

## 值班流程

1. 检查 Admin → SEO Dashboard 日报
2. 确认 `/v1/health/ready` 返回 200
3. 查看 Prometheus 告警 / Sentry 新错误
4. 检查备份 cron 昨日是否成功

## API 不可用

```bash
# 1. 健康检查
curl -f $API_URL/v1/health/ready

# 2. 查看日志
kubectl logs -l app=ai-tool-cms-api --tail=200

# 3. 检查 DB / Redis
psql $DATABASE_URL -c "SELECT 1"
redis-cli -u $REDIS_URL ping

# 4. 重启
kubectl rollout restart deployment/ai-tool-cms-api
```

## Worker 队列积压

```bash
redis-cli -u $REDIS_URL LLEN bull:ai-summary:wait
kubectl scale deployment/ai-tool-cms-worker --replicas=3
```

## 数据库慢查询

```bash
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# 检查 OTEL traces / 慢查询日志
```

## SEO / 爬虫异常

```bash
# 手动触发 sitemap ping
curl -X POST -H "Authorization: Bearer $JWT" \
  $API_URL/v1/seo/sitemap/ping

# 重建内部链接
curl -X POST -H "Authorization: Bearer $JWT" \
  $API_URL/v1/seo/sync/internal-links
```

## 联系升级

见 [Incident.md](./Incident.md) 分级与 on-call 流程。

## 相关

- [Monitoring.md](./Monitoring.md)
- [Backup.md](./Backup.md) · [Restore.md](./Restore.md)
