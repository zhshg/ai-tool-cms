# Clean Release Deployment

## 适用场景

- 生产服务器工作区存在未提交改动，不能直接在原目录 `git pull` 或 `docker compose up --build`
- 需要只基于 GitHub 某个已推送提交进行干净发布
- 需要保留生产 `.env.production`、`storage` 与数据库卷

## 核心原则

- 不覆盖原生产目录，例如 `/opt/ai-tool-cms`
- 每次发布都使用新的发布目录，例如 `/opt/ai-tool-cms-release-YYYYMMDD-HHMMSS`
- 发布源码只来自 GitHub 指定提交归档
- `docker compose` 固定使用项目名 `ai-tool-cms`，避免因为目录名变化创建并行容器

## 发布前检查

1. 确认目标提交已经推送到 GitHub。
2. 确认生产 `.env.production` 已包含本次所需环境变量。
3. 确认原生产目录存在可复用的 `storage` 目录。
4. 如原目录有脏工作区，先备份 `git status` 和 patch。

## 标准发布步骤

以下命令以提交 `749dbce6`、发布目录 `/opt/ai-tool-cms-release-20260706-133700` 为例。

### 1. 下载 GitHub 归档

```bash
rm -f /tmp/ai-tool-cms-release.zip
curl -fL https://codeload.github.com/zhshg/ai-tool-cms/zip/749dbce6 -o /tmp/ai-tool-cms-release.zip
ls -lh /tmp/ai-tool-cms-release.zip
```

### 2. 解压并准备发布目录

```bash
rm -rf /tmp/ai-tool-cms-release-src /opt/ai-tool-cms-release-20260706-133700
mkdir -p /tmp/ai-tool-cms-release-src /opt/ai-tool-cms-release-20260706-133700
python3 -m zipfile -e /tmp/ai-tool-cms-release.zip /tmp/ai-tool-cms-release-src
cp -a /tmp/ai-tool-cms-release-src/ai-tool-cms-749dbce6*/. /opt/ai-tool-cms-release-20260706-133700/
cp /opt/ai-tool-cms/.env.production /opt/ai-tool-cms-release-20260706-133700/.env.production
ln -sfn /opt/ai-tool-cms/storage /opt/ai-tool-cms-release-20260706-133700/storage
```

### 3. 从干净目录发布

```bash
cd /opt/ai-tool-cms-release-20260706-133700
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml up -d --build web admin api nginx
```

如果只需要前台配置生效，仍要注意 `docker compose` 可能联动重建依赖服务镜像，不能假设只会处理 `web/nginx`。

## 本次已验证的关键配置

- `docker/Dockerfile.next`
  - 支持 `PNPM_REGISTRY`
  - 默认使用 `https://registry.npmmirror.com`
- `docker/Dockerfile.node`
  - 支持 `PNPM_REGISTRY`
  - 默认使用 `https://registry.npmmirror.com`
- `docker-compose.prod.yml`
  - `web` 构建参数已接入 `NEXT_PUBLIC_GA_ID`
  - `web` 运行环境已接入 `NEXT_PUBLIC_GA_ID`

## 发布后验收

```bash
cd /opt/ai-tool-cms-release-20260706-133700
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/sitemap.xml
curl -I https://api.toolsdar.io/v1/health
curl -I https://admins.toolsdar.io/admin
```

额外检查 GA 是否生效：

```bash
docker compose -p ai-tool-cms --env-file .env.production -f docker-compose.prod.yml exec -T web sh -lc 'printenv | grep NEXT_PUBLIC_GA_ID'
curl -s https://toolsdar.io/en | grep -o 'G-V59J3MRC1P\|googletagmanager.com/gtag/js'
```

## 回收建议

- 保留最近一次成功发布目录，作为快速比对和应急回退参考
- 过旧的 `/opt/ai-tool-cms-release-*` 目录可人工清理
- `/tmp/ai-tool-cms-release*.zip` 与部署日志可定期清理

## 注意事项

- 不要在原生产目录的脏工作区直接构建镜像
- 不要把未知本地修改打进生产镜像
- 不要修改数据库卷挂载
- 不要把 `.env.production` 提交到 Git
