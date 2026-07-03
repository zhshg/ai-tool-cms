# Admin Next Redirect Fix Report

## Issue

Admin 登录页在带 `next` 参数时会把 `basePath=/admin` 重复拼接，导致登录成功后跳到错误地址：

- 输入：`/admin/login?next=%2Fadmin%2Fai-review`
- 错误结果：`/admin/admin/ai-review`
- 正确结果：`/admin/ai-review`

## Root Cause

登录页成功后直接执行：

- `router.replace(searchParams.get("next"))`

而 `next` 已经可能包含 `/admin/...`。

由于 Admin 应用本身已经配置了 `basePath=/admin`，Next Router 在处理应用内跳转时会再次补上 base path，最终造成：

- `/admin/ai-review` -> `/admin/admin/ai-review`

## Fix

新增统一的 Admin `next` 归一化逻辑：

- 仅允许同源相对路径
- 拒绝外部 URL
- 若 `next` 已经包含 `/admin/...`，先转换为 Router 内部路径
- 若 `next` 仅为 `/tools` 这类内部路径，直接保留
- 若 `next` 为空，则回到 Admin dashboard 根路径

### Code Changes

Updated:

- `apps/admin/src/lib/api.ts`
- `apps/admin/src/app/login/page.tsx`

### New Behavior

- `/admin/login?next=%2Fadmin%2Fai-review` -> Router path `/ai-review` -> Browser URL `/admin/ai-review`
- `/admin/login?next=%2Fadmin%2Ftools` -> Router path `/tools` -> Browser URL `/admin/tools`
- `/admin/login?next=%2Ftools` -> Router path `/tools` -> Browser URL `/admin/tools`
- `/admin/login` -> Router path `/` -> Browser URL `/admin`
- `next=https://evil.example/x` -> rejected -> fallback `/admin`
- `next=//evil.example/x` -> rejected -> fallback `/admin`

## Validation

Static checks passed:

- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/admin typecheck`

Helper validation passed:

- `normalizeAdminNextPath('/admin/ai-review') => '/ai-review'`
- `normalizeAdminNextPath('/admin/tools') => '/tools'`
- `normalizeAdminNextPath('/tools') => '/tools'`
- `normalizeAdminNextPath(null) => '/'`
- `normalizeAdminNextPath('https://evil.example/x') => '/'`
- `normalizeAdminNextPath('//evil.example/x') => '/'`

Production container verification passed:

- Admin container rebuilt successfully
- Admin app booted healthy behind nginx

## Result

The Admin login redirect no longer double-prefixes `basePath`.

No route should now become:

- `/admin/admin/...`
