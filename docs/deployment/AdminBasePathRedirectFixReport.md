# Admin Base Path Redirect Fix Report

## 问题

Admin 登录成功后被错误跳转到：

- `http://localhost/admin/admin`

该地址返回 `404`。

## 根因

Admin 应用已经通过 Next.js `basePath=/admin` 运行，但客户端代码仍手动拼接 `/admin`：

- 登录页成功后跳转时拼 `getAdminBasePath() + "/"`  
- `AuthGuard` 未登录跳转时拼 `getAdminBasePath() + "/login"`  
- Header / Sidebar 登出后跳转时拼 `getAdminBasePath() + "/login"`

在启用 `basePath=/admin` 的情况下，`router.replace("/login")` 会自动落到：

- `/admin/login`

如果手动再拼一层 `/admin`，就会变成：

- `/admin/admin`
- `/admin/admin/login`

## 修复策略

只修 Admin 前端路由，不修改后端逻辑。

原则：

- Admin 内部客户端导航只使用 app 路径：
  - `/`
  - `/login`
  - `/tools`
  - `/categories`
  - `/users`
  - `/settings`
- 不再手动拼接 `/admin`
- 让 Next.js `basePath=/admin` 自己处理最终 URL

## 修改文件

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)
- [apps/admin/src/app/login/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\login\page.tsx)
- [apps/admin/src/components/rbac/auth-guard.tsx](F:\project\ai-tool-cms\apps\admin\src\components\rbac\auth-guard.tsx)
- [apps/admin/src/components/layout/app-sidebar.tsx](F:\project\ai-tool-cms\apps\admin\src\components\layout\app-sidebar.tsx)
- [apps/admin/src/components/layout/site-header.tsx](F:\project\ai-tool-cms\apps\admin\src\components\layout\site-header.tsx)

## 具体修复

### 1. 统一 Admin 内部路由 helper

在 `api.ts` 中新增：

- `getAdminDashboardPath()` 返回 `/`
- `getAdminLoginPath()` 返回 `/login`

并让 `redirectToAdminLogin()` 改为跳：

- `/login?next=...`

而不是：

- `${basePath}/login?next=...`

### 2. 登录成功跳首页

`login/page.tsx` 改为：

- 默认跳转 `/`
- 如果有 `next` 参数，则优先跳 `next`

这样在 `basePath=/admin` 下，实际会落到：

- `http://localhost/admin`

### 3. 未登录守卫跳登录页

`AuthGuard` 改为：

- `router.replace("/login?next=...")`

避免生成：

- `/admin/login`
  再被 `basePath` 二次前缀成 `/admin/admin/login`

### 4. Header / Sidebar 登出跳转修复

登出后统一跳：

- `/login`

而不是：

- `${adminBasePath}/login`

## 预期正确 URL

- `http://localhost/admin`
- `http://localhost/admin/tools`
- `http://localhost/admin/categories`
- `http://localhost/admin/users`
- `http://localhost/admin/settings`

## 验证项

本次修复后应验证：

1. 登录成功后跳转到：
   - `http://localhost/admin`
2. 页面中不再出现：
   - `/admin/admin`
   - `/admin/admin/login`
3. Sidebar 导航仍正确落到：
   - `/admin/tools`
   - `/admin/categories`
   - `/admin/users`
   - `/admin/settings`
4. 刷新后 session 仍可恢复
5. `tools/categories/users/settings` 页面数据继续正常加载

## 风险说明

- `next` 查询参数如果本身带绝对 `/admin/...` 路径，仍可能把历史错误路径带回来；但新的守卫和登录跳转不会再继续制造双前缀。
- 本次未改动后端认证、API、权限逻辑，仅影响 Admin 客户端导航。
