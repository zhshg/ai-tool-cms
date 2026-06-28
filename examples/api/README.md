# API 示例

## list-tools.mjs

使用 Public API 列出工具并搜索。

```bash
# 在 Admin → Platform 创建 API Key
export TOOLCMS_API_KEY=atcms_your_key_here
export API_URL=http://localhost:4000

node examples/api/list-tools.mjs
```

## TypeScript SDK

```typescript
import { ToolCMSClient } from "@ai-tool-cms/sdk";

const client = new ToolCMSClient({
  apiKey: process.env.TOOLCMS_API_KEY!,
  baseUrl: "http://localhost:4000/v1/api/v1",
});

const { data } = await client.listTools({ page: { size: 10 } });
console.log(data);
```

## 文档

[docs/API.md](../docs/API.md)
