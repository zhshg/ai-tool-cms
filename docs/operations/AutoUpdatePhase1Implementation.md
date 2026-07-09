# Auto Update Phase 1 Implementation

## Scope

本阶段提供一个安全的 `manual-review` 流程，用于发现 AI 工具，默认不写入生产数据。

## Current Status

- 默认模式仍为 `manual-review`
- 默认不启用生产 `apply`
- 不启用 delete、archive、overwrite 行为
- 每次运行都会生成候选快照、Markdown 报告和日志
- 同一天多次运行不会再互相覆盖
- 前端分析可通过 `NEXT_PUBLIC_GA_ID` 配置
- 生产运行产物现在统一持久化到 `storage/auto-update`

## 已验证来源

- `github-trending`
- `hackernews`
- `huggingface-spaces`
- `futurepedia`
- `taaft`

## 关键实现说明

- 加固了 Windows fetch fallback，避免直接 Node fetch、`curl.exe` 或 PowerShell TLS 间歇性失败时整条链路中断
- `futurepedia` 已改为解析首页卡片，而不是依赖旧 API 路由
- `taaft` 已改为解析首页列表，而不是依赖被拦截的 API 路由
- `hackernews` 已从宽泛 AI 新闻过滤为更偏工具型条目
- 分类启发规则已扩展，使常见工具描述能映射到现有白名单
- 运行产物文件名现在包含日期、时间和来源摘要
- 生产 Markdown 报告与运行日志已迁移到 `storage/auto-update`，避免容器重建后丢失

## 稳定命令

当本地 `pnpm run` 被阻塞时，可使用以下命令：

```bash
node node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/cli.mjs packages/auto-update/src/cli.ts --mode=manual-review --limit=10 --source=github-trending --source=hackernews --source=huggingface-spaces --source=futurepedia --source=taaft
```

## 最近验证结果

- `dryRun=true`
- `fetched=33`
- `create=33`
- `draft=0`
- `updateEmpty=0`
- `skip=0`
- `warnings=0`

产物：

- `storage/auto-update/reports/auto-update-2026-07-09-090722-futurepedia.md`
- `storage/auto-update/candidates/auto-update-2026-07-09-090722-futurepedia.json`
- `storage/auto-update/logs/2026-07-09-090722-futurepedia.log`

历史说明：

- 较早的仓库样例可能仍保留在 `docs/operations/reports/` 与 `logs/auto-update/`。
- 新的生产运行结果应统一到 `/opt/ai-tool-cms/storage/auto-update/` 下查看。

## 第二阶段候选项

- 为仅首页来源增加更强的来源特定 enrich
- 将分类精度提升到超出正则启发规则的水平
- 为候选提供 Admin 审核界面
- 为未来可选的 `safe-auto` 上线预留受保护路径
