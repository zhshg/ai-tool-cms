# Daily Auto Update

## 概览

第一阶段提供每日 auto-update 流程，默认运行在 `manual-review` 模式，不会默认写入生产数据。

入口命令：

```bash
pnpm run tools:auto-update
```

常用示例：

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
  - 自动生成候选
  - 自动 dry-run
  - 持久化快照、报告和日志
  - 不写生产库
- `safe-auto`
  - 只允许 `create`
  - 只允许高置信度候选
  - 每天最多 5 条 `published`
  - 不覆盖非空字段
  - 需要 `TOOLS_AUTO_APPLY=true` 且显式传入 `--apply`
- `full-auto`
  - 为后续阶段预留
  - 当前阶段不允许执行真实 apply

## 数据来源

当前已接入的 adapter：

- `producthunt`
- `futurepedia`
- `taaft`
- `github-trending`
- `huggingface-spaces`
- `hackernews`
- `reddit-ai`

说明：

- Product Hunt、Hacker News、Reddit 更偏“发现型来源”，很多时候只拿得到候选链接，仍需人工复核官网。
- Futurepedia 与 TAAFT 更偏“目录型来源”，通常字段完整度更高。

## 安全规则

- 默认不 delete
- 默认不 archive
- 默认不 truncate
- 默认不 drop
- 默认不覆盖已有非空字段
- `safe-auto` 默认不更新已有工具
- `safe-auto` 只允许 create
- 每天最多自动发布 5 条
- 低置信度候选不会自动发布

## 输出产物

新的生产产物现在统一持久化到 `storage/auto-update`：

- 候选快照：`storage/auto-update/candidates/auto-update-<run-id>.json`
- Markdown 报告：`storage/auto-update/reports/auto-update-<run-id>.md`
- 运行日志：`storage/auto-update/logs/<run-id>.log`

生产宿主机路径：

- `/opt/ai-tool-cms/storage/auto-update/candidates/`
- `/opt/ai-tool-cms/storage/auto-update/reports/`
- `/opt/ai-tool-cms/storage/auto-update/logs/`

注意：

- 不要再去 `docs/operations/reports/` 查找新的生产报告。
- 不要再去 `logs/auto-update/` 查找新的生产日志。
- `docs/operations/reports/` 只保留提交进仓库的历史样例。

## 生产命令

从 `api` 容器内执行：

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'cd /app && pnpm run tools:auto-update -- --mode=manual-review --limit=10'
```

运行后在宿主机验证最新产物：

```bash
cd /opt/ai-tool-cms
ls -lh storage/auto-update/candidates | tail
ls -lh storage/auto-update/reports | tail
ls -lh storage/auto-update/logs | tail
```

## Cron

推荐服务器 crontab：

```cron
0 3 * * * cd /opt/ai-tool-cms && docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api sh -lc 'cd /app && pnpm run tools:auto-update -- --mode=manual-review' >> /opt/ai-tool-cms/storage/auto-update/logs/cron-tools-auto-update.log 2>&1
```

说明：

- 默认使用 `manual-review`。
- 第一阶段不要默认启用 `--apply`。
- 如需受限自动写库，必须同时满足：
  - `TOOLS_AUTO_APPLY=true`
  - `--mode=safe-auto`
  - `--apply`

## GitHub Actions

推荐每日调度只做抓取与 dry-run：

- workflow 文件：`.github/workflows/tools-auto-update.yml`
- 默认环境变量：`TOOLS_AUTO_APPLY=false`

如果未来要启用受限 apply，建议只在自托管 runner 且明确注入生产环境变量时开启。
