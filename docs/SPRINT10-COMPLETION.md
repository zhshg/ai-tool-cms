# Sprint 10 完成标准

> 版本：**1.0.0-rc.1** · 分支：`cursor/sprint10-open-ecosystem-c760`

## 完成清单

| # | 标准 | 状态 | 验证方式 |
|---|------|------|----------|
| 1 | **网站可访问** | ✅ | `pnpm dev:web` → http://localhost:3000 — 首页展示分类/热门/最新工具 |
| 2 | **API 可供第三方使用** | ✅ | `GET /v1/api/v1/tools` + `X-Api-Key`；Swagger `/api/docs`；SDK `@ai-tool-cms/sdk` |
| 3 | **MCP 可供 AI 助手访问** | ✅ | `pnpm mcp`（esbuild 打包）；配置见 `packages/mcp-server/mcp-config.example.json` |
| 4 | **插件可扩展** | ✅ | `packages/plugins` 生命周期 + `plugins/` 目录 + `GET /v1/plugins` |
| 5 | **工作流可配置** | ✅ | `GET/PATCH /v1/workflow/definitions`；爬虫入库自动 `startWorkflowRun`；发布完成 `completeWorkflow` |
| 6 | **全链路可监控** | ✅ | `initObservability` + `withSpan` 覆盖 API Public 端点、Growth、Webhook Worker |
| 7 | **可发布 v1.0 RC** | ✅ | `CHANGELOG.md` · `docs/RELEASE-v1.0.0-rc.1.md` · Docker 入口修正 |

## 架构总览

```
                AI Tool Platform
                     Database
                         │
     ┌────────────┬──────────────┬────────────┬────────────┐
     ▼            ▼              ▼            ▼            ▼
   Website    REST API v1    MCP Server    Webhook Hub    SDK
     │            │              │            │
     ▼            ▼              ▼            ▼
  SEO 页面    第三方开发者    Cursor/Claude    n8n/Zapier
```

## 快速验证

```bash
# 1. 基础设施
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed

# 2. 启动服务
pnpm dev:stack          # Web :3000 + API :4000
pnpm dev:api            # 仅 API

# 3. Public API（需先在 Admin 创建 API Key）
curl -H "X-Api-Key: atcms_xxx" http://localhost:4000/v1/api/v1/tools

# 4. MCP Server
pnpm mcp

# 5. 工作流 & 插件（需 JWT + platform:read）
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/workflow/definitions
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/plugins

# 6. 构建验证
pnpm build
```

## 模块映射（Commits 091–100）

| Commit | 模块 | 包/路径 |
|--------|------|---------|
| 091 | Public REST API v1 | `packages/public-api`, `apps/api/src/public-api/` |
| 092 | GraphQL | ⏭️ Sprint 11 |
| 093 | MCP Server | `packages/mcp-server` |
| 094 | Developer SDK | `packages/sdk` |
| 095 | Webhook Hub | `apps/api/src/webhook-hub/` |
| 096 | Plugin Framework | `packages/plugins`, `plugins/` |
| 097 | Workflow Engine | `packages/workflow`, `apps/api/src/workflow/` |
| 098 | Feature Flags | `packages/feature-flags` |
| 099 | Observability | `packages/observability` |
| 100 | Release RC | `CHANGELOG.md`, `docs/RELEASE-v1.0.0-rc.1.md` |

## 已知限制（rc.1）

- GraphQL 推迟至 Sprint 11
- 工作流无拖拽 UI（通过 REST API / DB 配置 `steps` JSON）
- Rate limit 为内存实现（生产建议 Redis）
- Public API 路径 `/v1/api/v1/*`，网关可 rewrite 为 `/api/v1/*`
- Docker Compose 仅含基础设施，应用服务需在宿主机或 K8s 部署

## 发布步骤

```bash
git tag v1.0.0-rc.1
git push origin v1.0.0-rc.1

# Docker 构建 API 镜像
docker build --build-arg APP_NAME=api -f docker/Dockerfile -t ai-tool-cms-api:1.0.0-rc.1 .
```
