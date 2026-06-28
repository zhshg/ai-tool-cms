# 安装指南

## 本地开发

见 [GettingStarted.md](./GettingStarted.md)。

## Docker 基础设施

```bash
docker compose up -d --wait
```

包含：PostgreSQL、Redis、Meilisearch、MinIO、Mailpit。

## 生产部署

### 方式一：Docker 镜像

```bash
docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0

docker run -d \
  -p 4000:4000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e JWT_SECRET=... \
  ghcr.io/zhshg/ai-tool-cms:1.0.0
```

构建自定义镜像：

```bash
docker build --build-arg APP_NAME=api -f docker/Dockerfile -t ai-tool-cms-api:1.0.0 .
docker build --build-arg APP_NAME=web -f docker/Dockerfile -t ai-tool-cms-web:1.0.0 .
```

### 方式二：Kubernetes

参考 `docs/operations/Upgrade.md` 与 `docker/nginx/` 反向代理配置。

### 方式三：裸机 / PM2

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate:deploy
NODE_ENV=production node apps/api/dist/main.js
```

## 环境变量

完整列表见根目录 `.env.example`。生产必填：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `REDIS_URL` | Redis 连接串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `APP_URL` | 网站公网 URL |
| `API_URL` | API 公网 URL |
| `CORS_ORIGINS` | 允许的跨域来源 |

## 数据库

```bash
pnpm db:migrate:deploy   # 生产迁移
pnpm db:seed             # 可选：演示数据
```

## 验证安装

```bash
curl -f http://localhost:4000/v1/health/ready
curl http://localhost:3000
```

## 故障排除

见 [FAQ.md](./FAQ.md) 与 [operations/Runbook.md](./operations/Runbook.md)。
