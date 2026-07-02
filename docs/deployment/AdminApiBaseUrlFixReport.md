# Admin API Base URL Fix Report

## Summary

本次修复解决了 Admin 浏览器端 API 请求错误命中 `localhost:3001` 的问题。修复后，Admin 在浏览器端会优先使用公开 API gateway origin 生成 `/v1/*` 请求，因此登录会走：

- `POST http://localhost/v1/auth/login`

而不是：

- `POST http://localhost:3001/v1/auth/login`

## Root Cause

- Admin 之前的浏览器端 `getApiBase()` 在运行时可能退回到当前页面 origin。
- 当用户直接访问 `http://localhost:3001/admin/login` 时，当前页面 origin 就是 `http://localhost:3001`。
- 因此登录请求错误打到了 Admin 自己的 Next.js 服务，而不是 nginx 暴露的公共入口。
- 结果是 `/v1/auth/login` 在 3001 端口返回 `404`。

## Files Modified

- `apps/admin/src/lib/api.ts`

## Fix Details

### 1. Prefer public gateway origin in browser

浏览器端 `getApiBase()` 现在优先使用：

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

只要其中之一存在，就生成：

- `<public-origin>/v1`

在当前生产配置下：

- `NEXT_PUBLIC_API_URL=http://localhost`

因此浏览器端请求会变成：

- `http://localhost/v1/auth/login`

### 2. Stop downgrading localhost to current admin origin

此前逻辑会把某些 localhost 配置归一化为空，从而退回到当前页面 origin。
这在 `localhost:3001` 管理后台直连场景下会导致错误。

本次已移除这条降级路径。

### 3. Keep auth behavior unchanged

以下行为保持不变：

- 登录成功后写入 `localStorage.atcms_jwt`
- 写入 `localStorage.atcms_refresh_token`
- Admin API 请求附加 `Authorization: Bearer <token>`
- token 缺失或失效时跳转登录页

## Verification

已完成：

- `pnpm lint`
- `pnpm typecheck`
- `docker compose --env-file .env.production -f docker-compose.prod.yml build admin`
- `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`

结果：

- 全部通过

## Expected Runtime Behavior

修复生效后，浏览器 Network 面板中应看到：

- 登录请求 URL 为 `POST http://localhost/v1/auth/login`
- 不再是 `POST http://localhost:3001/v1/auth/login`

登录成功后应满足：

- `/admin/tools` 不再出现 `401`
- `/admin/categories` 不再出现 `401`
- `/admin/users` 不再出现 `401`
- `/admin/settings` 不再出现 `401`

## Notes

- 本次未修改 business logic。
- 本次未修改 public web 页面。
- 本次仅修复 Admin API base URL resolution。
