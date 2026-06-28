# 常见问题 (FAQ)

## 安装与启动

### Q: `pnpm docker:up` 失败？

确认 Docker 已启动，端口 5432/6379/7700 未被占用。运行 `docker compose logs` 查看详情。

### Q: 数据库迁移失败？

检查 `DATABASE_URL` 是否正确，PostgreSQL 是否就绪：`docker compose ps`。

### Q: Admin 显示无权限？

开发模式使用 `NEXT_PUBLIC_ADMIN_MOCK_ROLE=admin`。生产需 JWT 登录。

## API

### Q: Public API 返回 401？

需要有效的 API Key：`X-Api-Key: atcms_...`，在 Admin → Platform 创建。

### Q: 为什么路径是 `/v1/api/v1/tools`？

历史路由前缀叠加。生产建议在网关 rewrite 为 `/api/v1/*`。见 [KnownLimitations.md](./12-release/KnownLimitations.md)。

### Q: 如何导出 OpenAPI？

```bash
WRITE_OPENAPI=true pnpm --filter @ai-tool-cms/api build
```

## MCP

### Q: MCP 启动失败？

```bash
pnpm --filter @ai-tool-cms/mcp-server build
pnpm mcp
```

使用 esbuild 打包的 `dist/main.cjs`。配置见 `mcp-config.example.json`。

## SEO

### Q: Sitemap 为空？

确保有 `PUBLISHED` 状态的工具，访问 `http://localhost:3000/sitemap.xml`。

### Q: Search Console 无数据？

配置 `GOOGLE_SEARCH_CONSOLE_CREDENTIALS` 和 `BING_WEBMASTER_API_KEY`。

## 性能

### Q: 如何运行压测？

```bash
API_URL=http://localhost:4000 k6 run tests/performance/k6/public-api.js
```

## 部署

### Q: 生产用 Docker Compose 还是 K8s？

Compose 仅提供基础设施。应用推荐 K8s 或容器编排 + `docker/Dockerfile`。

### Q: 如何回滚？

见 [operations/Rollback.md](./operations/Rollback.md)。

## 更多

- [GettingStarted.md](./GettingStarted.md)
- [GitHub Discussions](https://github.com/zhshg/ai-tool-cms/discussions)
