# 快速开始

**目标：** 新开发者在 **30 分钟内** 完成本地部署并访问 Web + API + Admin。

## 前置条件

- Node.js ≥ 20
- pnpm ≥ 9
- Docker（PostgreSQL、Redis、Meilisearch）

## 5 分钟启动

```bash
git clone https://github.com/zhshg/ai-tool-cms.git
cd ai-tool-cms
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev:stack
```

| 服务 | URL |
|------|-----|
| Web | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |

默认管理员：`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`（见 `.env.example`）。

## 下一步

1. [Installation.md](./Installation.md) — 生产安装
2. [Architecture.md](./Architecture.md) — 系统架构
3. [API.md](./API.md) — API 参考
4. [examples/](../examples/) — 示例项目

## 常用命令

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # 单元 + 集成测试
pnpm test:e2e      # Playwright（需 dev:stack）
pnpm build         # 全量构建
pnpm mcp           # 启动 MCP Server
```

## 获取帮助

- [FAQ.md](./FAQ.md)
- [GitHub Discussions](https://github.com/zhshg/ai-tool-cms/discussions)
- [CONTRIBUTING.md](./Contributing.md)
