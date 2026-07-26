# Admin Auth Fix Report

## Summary

本次修复将 Admin dashboard 从 mock 身份展示切换为真实认证链路，统一通过 nginx 暴露的 `/v1` API 完成登录、鉴权、用户资料加载和未登录跳转。

## Root Cause

- Admin shell 之前展示的是前端 mock 用户状态，并未真正依赖 `/v1/auth/me`。
- `Tools`、`Categories`、`Users`、`Settings` 页面已经改为调用真实 API，且要求 `Authorization: Bearer <atcms_jwt>`。
- 结果就是页面外壳显示 `admin@example.com / Admin User`，但接口请求没有真实 JWT，因此统一返回 `401 Unauthorized`。

## Files Modified

- `apps/admin/src/app/(dashboard)/layout.tsx`
- `apps/admin/src/app/login/page.tsx`
- `apps/admin/src/components/dashboard/dashboard-summary.tsx`
- `apps/admin/src/components/layout/app-sidebar.tsx`
- `apps/admin/src/components/layout/site-header.tsx`
- `apps/admin/src/components/rbac/auth-guard.tsx`
- `apps/admin/src/components/rbac/auth-provider.tsx`
- `apps/admin/src/components/rbac/require-permission.tsx`
- `apps/admin/src/lib/api.ts`

## What Changed

### 1. Added real login route

- 新增 `/admin/login` 页面。
- 登录表单调用同源 `/v1/auth/login`。
- 登录成功后保存：
  - `localStorage.atcms_jwt`
  - `localStorage.atcms_refresh_token`

### 2. Connected dashboard to real auth state

- `AuthProvider` 不再解析 mock 用户。
- 页面初始化时，如果存在 `atcms_jwt`，会调用 `/v1/auth/me` 加载真实用户。
- 用户名、邮箱、角色、权限都改为来自真实 profile。

### 3. Added protected dashboard routing

- `(dashboard)` layout 增加 `AuthGuard`。
- token 缺失或 session 无效时，自动跳转到 `/admin/login`。
- 跳转会保留 `next` 参数，登录后回到原页面。

### 4. Unified API auth behavior

- `apiFetch` 统一附加 `Authorization: Bearer <token>`。
- token 缺失时，直接清理状态并跳转登录页。
- API 返回 `401` 时，自动清理 token 并跳转登录页。

### 5. Removed production mock display

- 顶部 header、侧边栏、dashboard session 卡片都不再依赖 mock 用户。
- 登出按钮会清理 token 并返回 `/admin/login`。

## Verification

已完成：

- `pnpm lint`
- `pnpm typecheck`

结果：

- 均通过

## Runtime Expectations

容器重建并加载最新前端产物后，应满足：

- 访问 `/admin/tools` 且未登录时，跳转到 `/admin/login`
- 登录成功后，`/admin/tools` 返回真实数据
- 登录成功后，`/admin/categories` 返回真实数据
- 登录成功后，`/admin/users` 返回真实数据
- 登录成功后，`/admin/settings` 返回真实数据
- 刷新页面后，如果 `atcms_jwt` 仍有效，会自动恢复 session
- 点击 `Sign out` 后会清理 token 并重新跳转登录页

## Notes

- 本次未修改 backend business logic。
- 本次未修改 public web 页面。
- mock mode 已不再作为默认生产行为；当前 dashboard 以真实认证为主链路。
