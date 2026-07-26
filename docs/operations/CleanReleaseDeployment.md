# Clean Release Deployment

## 适用场景

当生产目录存在脏改动、服务器代码树与本地不一致，或者不能安全地直接在原目录执行 `git pull` / `docker compose up --build` 时，使用干净发布目录流程。

## 核心原则

1. 不直接覆盖原生产目录
2. 每次发布使用新的 release 目录
3. 环境文件和 `storage` 复用生产现有资源
4. `docker compose` 固定使用项目名 `ai-tool-cms`
5. 数据卷不删除、不迁移、不重置

## 发布前检查

1. 目标提交已推送到远端
2. `.env.production` 已包含本次所需环境变量
3. `storage` 目录存在且内容完整
4. 已确认本次需要重建的服务范围

## 标准流程

以下以：

- 提交：`<commit>`
- 发布目录：`/opt/ai-tool-cms-release-YYYYMMDD-HHMMSS`

为例。

### 1. 下载归档

```bash
rm -f /tmp/ai-tool-cms-release.zip
curl -fL https://codeload.github.com/zhshg/ai-tool-cms/zip/<commit> -o /tmp/ai-tool-cms-release.zip
ls -lh /tmp/ai-tool-cms-release.zip
```

### 2. 解压并准备目录

```bash
rm -rf /tmp/ai-tool-cms-release-src /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS
mkdir -p /tmp/ai-tool-cms-release-src /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS
python3 -m zipfile -e /tmp/ai-tool-cms-release.zip /tmp/ai-tool-cms-release-src
cp -a /tmp/ai-tool-cms-release-src/ai-tool-cms-<commit>*/. /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS/
cp /opt/ai-tool-cms/.env.production /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS/.env.production
ln -sfn /opt/ai-tool-cms/storage /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS/storage
```

### 3. 在干净目录构建并发布

```bash
cd /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml build web
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web nginx
```

如果本次改动影响 `admin` 或 `api`，按需替换服务名。

## 构建建议

### 优先单服务构建

不要默认：

```bash
docker compose up -d --build
```

推荐：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build web
docker compose --env-file .env.production -f docker-compose.prod.yml build admin
docker compose --env-file .env.production -f docker-compose.prod.yml build api
```

### 优先后台日志构建

```bash
cd /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS
rm -f /tmp/toolsdar-web-build.log
nohup docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml build web > /tmp/toolsdar-web-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-web-build.log
```

## 发布后验收

```bash
cd /opt/ai-tool-cms-release-YYYYMMDD-HHMMSS
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/en/categories
curl -I https://toolsdar.io/sitemaps/en.xml
curl -I https://api.toolsdar.io/v1/health
curl -I https://admins.toolsdar.io/
```

## 回滚建议

1. 保留最近一个可用 release 目录
2. 保留最近一个可用镜像版本
3. 回滚时先恢复服务，再做页面验收

详细流程见：

- [Rollback.md](./Rollback.md)
- [ServerCleanupAndRollback.md](./ServerCleanupAndRollback.md)

## 注意事项

1. 不要在脏工作区直接长期构建生产镜像
2. 不要把本地未核对修改直接打进生产
3. 不要修改数据库卷挂载
4. 不要提交 `.env.production`
