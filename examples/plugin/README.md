# Plugin 示例

`summary-length.plugin.ts` 演示 `beforePublish` 钩子。

## 注册方式

1. 将插件加入 `packages/plugins` 注册表，或
2. 通过 `POST /v1/plugins` API 注册

## 开发

```bash
pnpm --filter @ai-tool-cms/plugins build
```

## 文档

[docs/PluginGuide.md](../docs/PluginGuide.md)
