# Server Cleanup And Rollback

## 适用场景

- 已完成一次或多次干净发布，服务器上残留多个 `/opt/ai-tool-cms-release-*` 目录
- `/tmp` 中堆积了发布归档、解压目录和部署日志
- 需要固化上线后的清理和快速回滚命令

## 清理原则

- 保留当前线上正在使用的最新发布目录
- 默认保留原生产目录 `/opt/ai-tool-cms`
- 只删除已经确认不再使用的旧发布目录
- 清理 `/tmp` 中的发布临时文件，不动系统其他临时文件

## 清理前检查

```bash
ls -ld /opt/ai-tool-cms-release-*
ls -lh /tmp/ai-tool-cms-release*
cd /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml ps
```

确认当前在线目录后，再执行删除。

## 标准清理命令

以下示例假设当前生效目录是 `/opt/ai-tool-cms-release-20260706-133700`。

### 删除旧发布目录

```bash
rm -rf /opt/ai-tool-cms-release-20260706-115151
rm -rf /opt/ai-tool-cms-release-20260706-130500
```

### 删除 `/tmp` 发布残留

```bash
rm -rf /tmp/ai-tool-cms-release-src
rm -f /tmp/ai-tool-cms-release.zip
rm -f /tmp/ai-tool-cms-release.tar
rm -f /tmp/ai-tool-cms-release-deploy.log
rm -f /tmp/ai-tool-cms-release-deploy-*.log
rm -f /tmp/ai-tool-cms-release-deploy-*.exit
```

### 清理后复核

```bash
ls -ld /opt/ai-tool-cms-release-* 2>/dev/null || true
ls -lh /tmp/ai-tool-cms-release* 2>/dev/null || true
cd /opt/ai-tool-cms-release-20260706-133700
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml ps
```

## 快速回滚

如果最新发布目录异常，而上一个发布目录仍然完整可用，可以直接在上一个目录重新执行：

```bash
cd /opt/ai-tool-cms-release-20260706-130500
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml up -d --build web admin api nginx
```

说明：

- `-p ai-tool-cms` 不能变，否则会创建另一套容器
- 回滚目录必须保留正确的 `.env.production`
- `storage` 软链必须仍指向 `/opt/ai-tool-cms/storage`

## 回滚前检查

```bash
ls -ld /opt/ai-tool-cms-release-20260706-130500/storage
test -f /opt/ai-tool-cms-release-20260706-130500/.env.production && echo OK
```

## 回滚后验收

```bash
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://api.toolsdar.io/v1/health
curl -I https://admins.toolsdar.io/admin
```

如果本次发布包含前端埋点，还应补充：

```bash
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml exec -T web sh -lc 'printenv | grep NEXT_PUBLIC_GA_ID'
curl -s https://toolsdar.io/en | grep -o 'G-V59J3MRC1P\|googletagmanager.com/gtag/js'
```

## 建议

- 始终保留最近 1 个可回滚发布目录
- 新版本稳定后再删除上一个发布目录
- 每次上线完成后，顺手清理 `/tmp` 发布残留
