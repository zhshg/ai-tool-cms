# Admin Login Redirect Fix Report

## Root Cause

Admin protected-route redirects were generating `/login` instead of `/admin/login`.

The underlying cause was that the Admin client helper hardcoded the login path as:

- `/login`

This ignored the Next.js `basePath=/admin` configuration used by the Admin app.

## Affected Files

- `apps/admin/src/lib/api.ts`

## What Was Fixed

### 1. Base path-aware login redirect helper

Updated Admin route helpers to respect the Admin base path:

- `getAdminBasePath()`
- `getAdminDashboardPath()`
- `getAdminLoginPath()`

### 2. Correct unauthenticated redirect target

All helpers that rely on `getAdminLoginPath()` now correctly resolve to:

- `/admin/login`

instead of:

- `/login`

### 3. Correct post-login dashboard target

`getAdminDashboardPath()` now resolves to:

- `/admin`

instead of returning the path root `/`, which could be interpreted incorrectly outside the Admin base path.

## Redirect Examples After Fix

- `/admin/tools` -> `/admin/login?next=%2Fadmin%2Ftools`
- `/admin/automation` -> `/admin/login?next=%2Fadmin%2Fautomation`
- after login -> `/admin/automation`

## Guardrails Preserved

- `next` parameter is preserved
- no redirect to root `/login`
- no duplicate `/admin/admin`
- backend logic unchanged

## Scope

- frontend Admin auth routing only
- no API behavior changed
- no auth business logic changed
