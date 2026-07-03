# Release Sprint Step 4.1: Tool Editor & Directory Content Polish

## Summary

本次交付围绕 Tool 编辑体验、目录内容完整度和前后台图标一致性做了定向增强，没有改动认证逻辑，也没有引入 schema migration。

完成内容：

- Admin Tool 编辑页 tags 改为“已选标签 + 按需展开选择器”
- Admin Tool 编辑页补齐 `Features`、`Screenshots`、`FAQ` 编辑区
- `Features` 和 `Screenshots` 持久化到现有 `Tool.metadata`
- `FAQ` 持久化到现有 `Faq` 表
- Admin Tools 列表与 Tool 编辑页接入统一图标 fallback 策略
- Public Tool Detail Alternatives 改为优先基于共享 tags 推荐，缺失时回退到同 category

## Files Modified

- [apps/admin/src/components/tools/tool-editor-form.tsx](/F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx)
- [apps/admin/src/components/tools/tool-logo.tsx](/F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-logo.tsx)
- [apps/admin/src/app/(dashboard)/tools/page.tsx](/F:/project/ai-tool-cms/apps/admin/src/app/(dashboard)/tools/page.tsx)
- [apps/admin/src/lib/api.ts](/F:/project/ai-tool-cms/apps/admin/src/lib/api.ts)
- [apps/api/src/tools/dto/tool.dto.ts](/F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts)
- [apps/api/src/tools/tools.service.ts](/F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts)
- [apps/web/src/lib/tool-page.ts](/F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts)
- [docs/release/Step4_1_ToolEditorContentPolish.md](/F:/project/ai-tool-cms/docs/release/Step4_1_ToolEditorContentPolish.md)

## Admin Tool Tags UX

已修复 Tool 编辑页标签交互问题：

- 默认只显示已选 tags
- 增加 `Add tag` / `Hide tag picker`
- 可选择现有 tags
- 可直接移除已选 tags
- 不再把全部 tags 常驻渲染成噪音区块

## Tool Editor Sections

### Features

- 新增可增删改的 feature 列表
- 保存到 `Tool.metadata.features`

### Screenshots

- 新增可增删改的 screenshot URL 列表
- 保存到 `Tool.metadata.screenshots`
- 未引入新媒体 schema，遵循现有 metadata 承载策略

### FAQ

- 新增可增删改的 FAQ 编辑区
- 保存到现有 `Faq` 表
- 更新时会同步当前 tool 的 FAQ 集合，而不是新增 schema

## Unified Tool Icon Strategy

Admin 与 Public 统一遵循以下优先级：

1. `Tool.logoUrl`
2. collected logo / discovered logo
3. initials avatar
4. category icon
5. default AI icon

当前应用位置：

- Admin tools list
- Admin tool edit page
- Public tool cards
- Public tool detail page

结果：

- 不再出现 broken image icon
- 前后台图标体验更一致

## Public Alternatives Logic

Public Tool Detail Alternatives 已调整为：

- 优先推荐至少共享一个 tag 的工具
- 排序中保留稳定 pseudo-random 抖动，避免 SSR 下完全死板
- 排除当前工具
- 限制数量为 5
- 如果没有同 tag 工具，则回退到同 category
- 如果仍然没有结果，则不渲染 Alternatives 区块

## Persistence Strategy

复用现有模型和 API：

- `features` -> `Tool.metadata.features`
- `screenshots` -> `Tool.metadata.screenshots`
- `faqs` -> `Faq` model

未新增 Prisma migration。

## Verification

已通过：

- `pnpm --filter @ai-tool-cms/api lint`
- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/web lint`
- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/admin typecheck`
- `pnpm --filter @ai-tool-cms/web typecheck`
- `docker compose --env-file .env.production -f docker-compose.prod.yml build web admin api`

## Outcome

本批次把 Tool 编辑页从基础表单推进到可维护目录内容的运营表单，同时把 public alternatives 和图标策略补到了上线前可接受水平。
