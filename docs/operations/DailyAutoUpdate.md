# Daily Auto Update

## 概览

第一阶段已实现每日自动更新框架，默认运行在 `manual-review` 模式，不会默认写入生产库。

入口命令：

```bash
pnpm run tools:auto-update
```

支持参数：

```bash
pnpm run tools:auto-update -- --mode=manual-review --limit=10
pnpm run tools:auto-update -- --mode=safe-auto --limit=5 --dry-run
pnpm run tools:auto-update -- --mode=safe-auto --limit=5 --apply
pnpm run tools:auto-update -- --source=producthunt --source=futurepedia
pnpm run tools:auto-update -- --date=2026-07-06
```

## 模式

- `manual-review`
  - 自动抓取
  - 自动生成候选工具
  - 自动 dry-run
  - 保存候选快照与报告
  - 不执行生产写库
- `safe-auto`
  - 只允许 create 新工具
  - 只允许高置信度候选
  - 每天最多 5 条 published
  - 不覆盖已有非空字段
  - 需要 `TOOLS_AUTO_APPLY=true` 且显式传入 `--apply`
- `full-auto`
  - 当前阶段只预留
  - 不允许执行实际 apply

## 数据来源

当前已接入以下 adapter：

- `producthunt`
- `futurepedia`
- `taaft`
- `github-trending`
- `huggingface-spaces`
- `hackernews`
- `reddit-ai`

说明：

- Product Hunt、Hacker News、Reddit 属于“发现型来源”，可能只能得到候选链接，仍需人工复核官网。
- Futurepedia 与 TAAFT 属于“目录型来源”，字段完整度通常更高。

## 安全规则

- 默认不 delete
- 默认不 archive
- 默认不 truncate
- 默认不 drop
- 默认不覆盖已有非空字段
- `safe-auto` 默认不 update 已有工具
- `safe-auto` 只允许 create
- 每日最多自动发布 5 条
- 低置信度候选不会自动发布

## 输出文件

- 候选快照：`storage/auto-update/candidates/auto-update-YYYY-MM-DD.json`
- 日志文件：`logs/auto-update/YYYY-MM-DD.log`
- 报告文件：`docs/operations/reports/auto-update-YYYY-MM-DD.md`

当前阶段候选工具先落到 JSON 快照，不默认新增 Admin 审核 UI。

## Cron

服务器推荐配置：

```cron
0 3 * * * cd /opt/ai-tool-cms && pnpm run tools:auto-update -- --mode=manual-review >> /opt/ai-tool-cms/logs/cron-tools-auto-update.log 2>&1
```

说明：

- 默认使用 `manual-review`
- 第一阶段不要默认启用 `--apply`
- 如需受限自动写库，必须同时满足：
  - `TOOLS_AUTO_APPLY=true`
  - `--mode=safe-auto`
  - `--apply`

## GitHub Actions

推荐每日调度只做抓取与 dry-run：

- workflow 文件：`.github/workflows/tools-auto-update.yml`
- 默认环境变量：`TOOLS_AUTO_APPLY=false`

如果未来要启用受限 apply，建议只在自托管 runner 且明确注入生产环境变量时开启。
