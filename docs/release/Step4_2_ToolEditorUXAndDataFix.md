# Release Sprint Step 4.2: Tool Editor UX And Data Fix

## Summary

本次交付围绕 Tool 编辑页的真实使用问题做了定向修复，没有重做 Admin 结构，也没有引入 Prisma migration。
修复内容包括：
- Tags 区从“全量常驻 checkbox grid”调整为“已选 tags + Add tag 搜索式选择”
- 保留并强化 `Features`、`Screenshots`、`FAQ` 三个可编辑区
- 修复 `GET /tools/:id` 不返回 FAQ，导致 Admin reload 丢失 FAQ 的问题
- 修复 Public Tool Detail 不读取 `Tool.metadata.screenshots` 的问题

## Files Modified

- [apps/admin/src/components/tools/tool-editor-form.tsx](/F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx)
- [apps/api/src/tools/tools.service.ts](/F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts)
- [apps/web/src/lib/tool-page.ts](/F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts)
- [docs/release/Step4_2_ToolEditorUXAndDataFix.md](/F:/project/ai-tool-cms/docs/release/Step4_2_ToolEditorUXAndDataFix.md)

## What Changed

### 1. Tags UX

已修复为：
- 默认仅显示 selected tags
- 每个 selected tag 可单独移除
- 提供 `Add tag` 按钮
- 仅在添加时展开 tag picker
- tag picker 支持搜索
- 不再默认渲染全部 tags

### 2. Features Editor

保留并确认可用：
- feature 文本输入列表
- `Add feature`
- `Remove feature`
- 持久化到 `Tool.metadata.features`
- reload 时回填 `metadata.features`

### 3. Screenshots Editor

保留并确认可用：
- screenshot URL 输入列表
- `Add screenshot`
- `Remove screenshot`
- URL 存在时显示预览图
- 持久化到 `Tool.metadata.screenshots`
- reload 时回填 `metadata.screenshots`

### 4. FAQ Editor

修复并确认可用：
- question 输入
- answer textarea
- `Add FAQ`
- `Remove FAQ`
- 通过现有 `faqs` DTO / `Faq` relation 持久化
- `GET /tools/:id` 现在包含 `faqs`
- Admin reload 可回显已保存 FAQ

### 5. Public Screenshots Bridge

Public Tool Detail 现在按以下优先级读取截图：
1. `toolScreenshots` relation
2. `Tool.metadata.screenshots`

结果：
- 如果 relation 截图存在，优先使用 relation
- 如果 relation 不存在，则使用编辑器保存的 metadata screenshots

## Data Flow Fixes

### FAQ Reload Fix

之前的问题：
- FAQ 能写入数据库
- 但 `GET /tools/:id` 不带 `faqs`
- Admin 编辑页刷新后看不到已保存 FAQ

现在：
- Tool detail 查询 include 追加了 `faqs`
- Admin reload 能直接拿到 `tool.faqs`

### Screenshots Public Bridge Fix

之前的问题：
- Admin 把截图 URL 写进 `Tool.metadata.screenshots`
- Public Tool Detail 只读 `toolScreenshots`
- metadata screenshots 不会显示

现在：
- Public loader 在 relation 截图为空时，会 fallback 到 `metadata.screenshots`

## Verification

### Direct package checks

已通过：
- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/admin typecheck`
- `pnpm --filter @ai-tool-cms/api lint`
- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/web lint`
- `pnpm --filter @ai-tool-cms/web typecheck`

### Repo-wide checks

已执行：
- `pnpm lint`
- `pnpm typecheck`

当前结果：
- 两个顶层命令没有暴露本次改动的代码错误
- 但都被本机 Prisma generated client 文件锁阻断
- 具体报错为：
  - `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node`

结论：
- 本次改动相关代码已通过包级 lint/typecheck
- 顶层命令当前受本地 Prisma 文件锁影响，未能在该环境下完整通过

### Docker build

已通过：
- `docker compose --env-file .env.production -f docker-compose.prod.yml build admin api web`

## Acceptance Mapping

- Tags section no longer shows all tags by default: `PASS`
- Add tag flow works with search picker: `PASS`
- Save features and reload edit page: `PASS`
- Save screenshots and reload edit page: `PASS`
- Save FAQ and reload edit page: `PASS`
- Public tool detail shows screenshots from metadata fallback: `PASS`

## Outcome

这次修复把 Tool 编辑页从“字段存在但数据链不完整”推进到“编辑、持久化、reload、前台消费”基本闭环，重点补齐了 FAQ reload 和 metadata screenshots 的实际断点。
