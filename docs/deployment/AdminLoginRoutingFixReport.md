# Admin Login Routing Fix Report

## Summary

本次修复解决了 Admin 登录请求错误命中 Next.js Admin 路由的问题。修复后，浏览器端认证请求会显式走 nginx 暴露的同源绝对 API 路径 `/v1/*`，不会再落到 `/admin/v1/*`，也不会把 Next.js 404 HTML 误显示为登录错误。

## Root Cause

- Admin 运行在 `basePath=/admin` 下。
- 登录和鉴权逻辑虽然意图请求 `/v1/auth/login`，但浏览器侧 API 基址仍存在被 `basePath`/运行时环境解析为 admin 路由的风险。
- 一旦请求落到 `/admin/v1/auth/login`，返回的就是 Admin 自身的 Next.js 404 HTML，而不是 API JSON。
- 前端此前直接把响应文本展示在错误面板中，因此用户看到的是：
  - `<title>404: This page could not be found.</title>`
  - `<title>AI Tool CMS Admin</title>`

## Files Modified

- `apps/admin/src/lib/api.ts`
- `apps/admin/src/components/rbac/auth-provider.tsx`

## Fix Details

### 1. Force browser auth requests to same-origin absolute `/v1`

在浏览器端，`getApiBase()` 现在固定返回：

- `new URL("/v1", window.location.origin).toString()`

这确保：

- 登录请求是 `http(s)://<public-origin>/v1/auth/login`
- 当前页面即使位于 `/admin/login`
- 也绝不会请求 `/admin/v1/auth/login`
- 也不会使用 `http://api:4000` 这种 Docker 内部地址

### 2. Preserve server-side compatibility

在非浏览器环境下，`getApiBase()` 仍保留基于 `NEXT_PUBLIC_API_URL` 的后备逻辑，避免破坏服务端上下文。

### 3. Normalize HTML error responses

新增 `readApiError()`：

- 如果响应 `content-type` 是 `text/html`
- 不再把原始 HTML 塞进错误 UI
- 而是输出明确错误：
  - `API route returned HTML instead of JSON. Please verify nginx routes /v1/* to the API service.`

### 4. Keep token flow unchanged

修复后仍保持：

- 登录成功后写入 `localStorage.atcms_jwt`
- 同时保存 `localStorage.atcms_refresh_token`
- 后续 `apiFetch()` 自动附加 `Authorization: Bearer <token>`

## Verification

已完成：

- `pnpm lint`
- `pnpm typecheck`
- `docker compose --env-file .env.production -f docker-compose.prod.yml build admin api nginx`
- `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`

结果：

- 全部通过

## Expected Runtime Behavior

修复生效后，浏览器网络面板中应看到：

- 登录请求 URL 为 `/v1/auth/login`
- 响应类型为 JSON
- 不再出现 `/admin/v1/auth/login`
- 不再出现 Next.js 404 HTML 作为登录错误正文

成功登录后应满足：

- `/admin/tools` 加载真实数据
- `/admin/categories` 加载真实数据
- `/admin/users` 加载真实数据
- `/admin/settings` 加载真实数据
- 页面不再出现 `401 Unauthorized`

## Notes

- 本次未修改 backend business logic。
- 本次未修改 public web 页面。
- 当前生产 `.env.production` 中 `NEXT_PUBLIC_API_URL=http://localhost` 虽然在本修复后不会再影响浏览器认证路由，但从部署可维护性角度，后续仍建议统一改为公网 origin。
