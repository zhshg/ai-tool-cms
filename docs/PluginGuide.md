# 插件开发指南

AI Tool CMS 提供 **Plugin Framework**（`@ai-tool-cms/plugins`），允许在工具生命周期中注入自定义逻辑。

## 生命周期钩子

| 钩子 | 触发时机 |
|------|----------|
| `onToolCreated` | 工具创建后 |
| `beforePublish` | 发布前（可拦截） |
| `afterPublish` | 发布后 |
| `onCrawlComplete` | 采集完成 |
| `onAiGenerated` | AI 内容生成后 |

## 创建插件

```typescript
// packages/plugins 或独立 npm 包
import type { PluginDefinition } from "@ai-tool-cms/plugins";

export const myPlugin: PluginDefinition = {
  id: "my-custom-plugin",
  name: "My Custom Plugin",
  version: "1.0.0",
  hooks: {
    beforePublish: async (ctx) => {
      if (!ctx.tool.summary) {
        return { allow: false, reason: "Summary required" };
      }
      return { allow: true };
    },
    afterPublish: async (ctx) => {
      console.log(`Published: ${ctx.tool.slug}`);
    },
  },
};
```

## 注册插件

通过数据库 seed 或 Admin API：

```bash
# 数据库 seed 自动注册默认插件
pnpm db:seed
```

REST：`GET /v1/plugins` · `POST /v1/plugins`

## 最佳实践

1. **幂等** — 钩子可能被重试
2. **快速返回** — 耗时操作放入队列
3. **错误处理** — 返回明确 `reason` 供 Admin 展示
4. **版本化** — 插件自带 `version` 字段

## 示例

完整示例见 [examples/plugin/](../examples/plugin/)。

## 相关

- [WorkflowGuide.md](./WorkflowGuide.md) — 工作流与插件协作
- Sprint 10 开放生态文档
