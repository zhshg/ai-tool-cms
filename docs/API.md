# API 参考

## 基础信息

| 项目 | 值 |
|------|-----|
| Admin API Base | `{API_URL}/v1` |
| Public API Base | `{API_URL}/v1/api/v1` |
| OpenAPI | `{API_URL}/api/docs` |
| 认证（Admin） | Bearer JWT |
| 认证（Public） | `X-Api-Key: atcms_...` |

## Admin API 模块

| 模块 | 前缀 | 说明 |
|------|------|------|
| Tools | `/v1/tools` | 工具 CRUD |
| Categories | `/v1/categories` | 分类管理 |
| Crawler | `/v1/crawler` | 采集仪表盘 |
| AI | `/v1/ai` | AI 生成与审核 |
| SEO | `/v1/seo` | SEO 健康度、Sitemap |
| Search | `/v1/search` | 搜索管理 |
| Growth | `/v1/growth` | 增长中心 |
| Platform | `/v1/platform` | API Key、Webhooks |
| Workflow | `/v1/workflow` | 工作流 |
| Health | `/v1/health` | 存活 / 就绪 / 指标 |

## Public API v1

```bash
# 列出工具
curl -H "X-Api-Key: $API_KEY" \
  "http://localhost:4000/v1/api/v1/tools?page[size]=20"

# 搜索
curl -H "X-Api-Key: $API_KEY" \
  "http://localhost:4000/v1/api/v1/search?q=image+generation"

# 热门工具
curl -H "X-Api-Key: $API_KEY" \
  "http://localhost:4000/v1/api/v1/trending"
```

### 特性

- Cursor 分页
- ETag / Cache-Control
- Rate limiting（按 API Key）
- OpenAPI 3.1 规范

## TypeScript SDK

```typescript
import { ToolCMSClient } from "@ai-tool-cms/sdk";

const client = new ToolCMSClient({
  apiKey: process.env.TOOLCMS_API_KEY!,
  baseUrl: "http://localhost:4000/v1/api/v1",
});

const tools = await client.listTools({ page: { size: 10 } });
const results = await client.search({ q: "chatgpt" });
```

## MCP Server

```bash
pnpm mcp
```

工具：`search_tools`、`get_tool`、`compare_tools`、`list_categories`、`list_trending`、`get_pricing`、`latest_tools`。

配置：`packages/mcp-server/mcp-config.example.json`

## Webhooks

注册：`POST /v1/platform/webhooks`

事件：`TOOL_ADDED`、`TOOL_UPDATED`、`TOOL_DELETED`、`CRAWLER_FINISHED`、`AI_GENERATED`、`SEO_UPDATED`

## 错误格式

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## 更多

- Swagger UI：启动 API 后访问 `/api/docs`
- 示例：[examples/api/](../examples/api/)
