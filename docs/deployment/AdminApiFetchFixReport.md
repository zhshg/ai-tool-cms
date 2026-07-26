# Admin API Fetch Fix Report

## Summary

This fix resolves the production admin fetch issue where Tools, Categories, Users, and Settings showed `API error: Failed to fetch`.

The fix is limited to:

- admin browser-side API routing
- auth token handling in fetch
- clearer unauthenticated / unauthorized error display

No business logic or admin UI structure was redesigned.

## Root Cause

Admin browser-side fetches were building requests from:

- `NEXT_PUBLIC_API_URL + "/v1"`

When the production client bundle fell back to the default value:

- `http://localhost:4000`

the browser requested:

- `http://localhost:4000/v1/...`

In production, that points to the end user's own machine, not the deployed API behind nginx, which causes:

- `ERR_CONNECTION_REFUSED`
- `Failed to fetch`

## Fix Applied

### 1. Route browser API calls through nginx using relative paths

Updated:

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)

Behavior now:

- if `NEXT_PUBLIC_API_URL` is unset, empty, same-origin, or localhost-like, admin uses relative `/v1/...`
- this ensures browser requests go through the public nginx origin

### 2. Never rely on Docker internal hostnames in browser code

Browser code no longer depends on:

- `http://api:4000`
- `http://localhost:4000`

for production fetches.

### 3. Preserve auth token inclusion

Admin fetch still includes:

- `Authorization: Bearer <atcms_jwt>`

from:

- `window.localStorage.atcms_jwt`

### 4. Show explicit unauthenticated / unauthorized states

For target pages:

- `/admin/tools`
- `/admin/categories`
- `/admin/users`
- `/admin/settings`

errors now show:

- `401 Unauthorized` when token is missing or auth fails
- `403 Forbidden` when permission is denied
- explicit network-routing message for true network failures

instead of a generic `Failed to fetch`.

## Files Modified

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)
- [apps/admin/src/app/(dashboard)/tools/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\tools\page.tsx)
- [apps/admin/src/app/(dashboard)/categories/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\categories\page.tsx)
- [apps/admin/src/app/(dashboard)/users/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\users\page.tsx)
- [apps/admin/src/app/(dashboard)/settings/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\settings\page.tsx)

## Expected Production Result

Admin browser requests should now look like:

- `/v1/tools?pageSize=50`
- `/v1/categories?pageSize=50`
- `/v1/users?pageSize=50`
- `/v1/users/summary`
- `/v1/settings?pageSize=50`
- `/v1/settings/summary`

These are served by nginx and proxied to the API container.

## Verification Checklist

- `/admin/tools` should load data when authenticated
- `/admin/categories` should load data when authenticated
- `/admin/users` should load data when authenticated
- `/admin/settings` should load data when authenticated
- browser Network should no longer show requests to `localhost:4000`
- browser Network should not show CORS errors for these pages
- API should return `200`, or `401/403` when auth/permission is missing

## Notes

This fix intentionally does not add or redesign a full login flow.
It only ensures that:

- routing is correct in production
- token is attached where required
- auth failures are shown clearly
