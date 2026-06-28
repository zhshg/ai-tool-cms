# 工作流指南

**Workflow Engine**（`@ai-tool-cms/workflow`）定义内容从采集到发布的可配置流水线。

## 默认发布流水线

```
Crawl → Normalize → AI Generate → AI Review → SEO Sync → Publish
```

## API

```bash
# 列出工作流定义
curl -H "Authorization: Bearer $JWT" \
  http://localhost:4000/v1/workflow/definitions

# 触发工具发布工作流
curl -X POST -H "Authorization: Bearer $JWT" \
  http://localhost:4000/v1/workflow/run \
  -d '{"toolId":"...","workflowId":"publish-default"}'
```

## 工作流定义结构

```json
{
  "id": "publish-default",
  "name": "Default Publish Pipeline",
  "steps": [
    { "id": "ai-generate", "type": "ai.generate", "config": {} },
    { "id": "ai-review", "type": "ai.review", "config": { "autoApprove": false } },
    { "id": "seo-sync", "type": "seo.sync", "config": {} },
    { "id": "publish", "type": "tool.publish", "config": {} }
  ]
}
```

## 与插件集成

工作流步骤可触发 Plugin 钩子。例如 `tool.publish` 步骤执行 `beforePublish` / `afterPublish`。

## 与爬虫 / 增长集成

Sprint 10 已将 crawler、growth 事件接入工作流引擎，支持自动化运营闭环。

## 配置

- Seed：`pnpm db:seed` 引导默认工作流
- Admin → Automation 查看 MCP / 自动化中心

## 限制（v1.0）

- 无拖拽 UI — 通过 REST API 或数据库配置
- v2.0 计划 Workflow Builder 可视化编辑器

## 示例

见 [examples/starter/](../examples/starter/) 中的工作流触发脚本。
