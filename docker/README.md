# Docker 本地开发环境

一条命令启动所有基础设施：

```bash
docker compose up -d
```

## 服务

| 服务 | 端口 | 用途 | 默认凭据 |
|------|------|------|----------|
| PostgreSQL | 5432 | 主数据库 | `user` / `password` / `ai_tool_cms` |
| Redis | 6379 | 缓存 / 队列 | 无密码 |
| Meilisearch | 7700 | 全文搜索 | 开发模式无密钥 |
| MinIO | 9000 (API), 9001 (控制台) | 对象存储 | `minioadmin` / `minioadmin` |
| Mailpit | 1025 (SMTP), 8025 (Web UI) | 开发邮件测试 | 无认证 |
| Nginx | 80 | 反向代理（可选） | — |

## 与 API 连接

复制根目录 `.env.example` 为 `.env` 后，以下变量已与 compose 默认值对齐：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_tool_cms
REDIS_URL=redis://localhost:6379
MEILI_URL=http://localhost:7700
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
SMTP_HOST=localhost
SMTP_PORT=1025
MAILPIT_URL=http://localhost:8025
```

启动 API：

```bash
docker compose up -d
pnpm dev:api
```

健康检查：`GET http://localhost:4000/health`

## 常用命令

```bash
docker compose ps          # 查看状态
docker compose logs -f     # 查看日志
docker compose down        # 停止并移除容器
docker compose down -v     # 停止并清除数据卷
```
