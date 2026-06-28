# Docker 部署示例

## 基础设施

```bash
# 仓库根目录
docker compose up -d --wait
```

## 构建应用镜像

```bash
# API
docker build --build-arg APP_NAME=api -f docker/Dockerfile -t ai-tool-cms-api:local .

# Web
docker build --build-arg APP_NAME=web -f docker/Dockerfile -t ai-tool-cms-web:local .
```

## 生产拉取

```bash
docker pull ghcr.io/zhshg/ai-tool-cms:1.0.0
```

## docker-compose 扩展示例

```yaml
# examples/docker/docker-compose.app.yml（参考）
services:
  api:
    image: ghcr.io/zhshg/ai-tool-cms:1.0.0
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/ai_tool_cms
      REDIS_URL: redis://redis:6379
      JWT_SECRET: change-me
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
```

完整 Nginx 配置见 `docker/nginx/`。

## 相关

- [docs/Installation.md](../docs/Installation.md)
- [docs/Deployment.md](../docs/Deployment.md)
