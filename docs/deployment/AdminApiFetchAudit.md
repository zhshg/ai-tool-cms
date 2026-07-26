# Admin API Fetch Audit

## Current Status

Production admin pages such as Tools, Categories, Users, and Settings can render their page shell, but their client-side data requests fail with `API error: Failed to fetch`.

This is primarily a deployment/runtime configuration problem, not a page rendering problem.

## Root Cause

The most likely production root cause is that the admin client bundle uses the wrong API base URL:

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts) builds requests as:
  - `API_BASE = ${clientEnv.NEXT_PUBLIC_API_URL}/v1`
- [packages/config/src/client.ts](F:\project\ai-tool-cms\packages\config\src\client.ts) defaults `NEXT_PUBLIC_API_URL` to:
  - `http://localhost:4000`
- [docker/Dockerfile.next](F:\project\ai-tool-cms\docker\Dockerfile.next) does not pass `NEXT_PUBLIC_API_URL` as a build arg, and Next client code is built during image build.

That means if `NEXT_PUBLIC_API_URL` is not present during the admin image build, the browser bundle falls back to:

- `http://localhost:4000/v1`

and pages then request URLs like:

- `http://localhost:4000/v1/tools?pageSize=50`
- `http://localhost:4000/v1/categories?pageSize=50`
- `http://localhost:4000/v1/users?pageSize=50`
- `http://localhost:4000/v1/settings?pageSize=50`

In a real production browser session, `localhost:4000` refers to the end user's own machine, not the server running the API. That causes a browser-level network failure, which surfaces as `Failed to fetch`.

## Why The Pages Load But Data Fails

The admin app shell is served by nginx and the admin Next.js app:

- [docker-compose.prod.yml](F:\project\ai-tool-cms\docker-compose.prod.yml)
- [docker/nginx/conf.d/production.conf](F:\project\ai-tool-cms\docker\nginx\conf.d\production.conf)
- [apps/admin/next.config.ts](F:\project\ai-tool-cms\apps\admin\next.config.ts)

So `/admin`, `/admin/tools`, `/admin/categories`, `/admin/users`, and `/admin/settings` can load normally.

However, each page then runs client-side `fetch(...)` inside `useEffect`:

- [tools/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\tools\page.tsx)
- [categories/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\categories\page.tsx)
- [users/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\users\page.tsx)
- [settings/page.tsx](F:\project\ai-tool-cms\apps\admin\src\app\(dashboard)\settings\page.tsx)

Those fetches depend entirely on the client-side `NEXT_PUBLIC_API_URL` value. If that value is wrong, the page shell still renders but all data panels fail.

## What API URL Admin Uses In Production

Based on source code, admin is intended to use:

- `NEXT_PUBLIC_API_URL + "/v1"`

If deployment is configured exactly as the example file suggests:

- [\.env.production.example](F:\project\ai-tool-cms\.env.production.example)

then the intended production API base is:

- `https://example.com/v1`

and the intended request URL for Tools is:

- `https://example.com/v1/tools?pageSize=50`

However, based on the current build pipeline and compiled admin artifacts, the effective fallback can become:

- `http://localhost:4000/v1`

That is the most likely exact failing URL family in production.

## Whether It Points To `localhost:4000`, `/v1`, `/api`, Or Another Origin

From code:

- Admin does **not** call `/api`
- Admin does **not** call `/v1` relative to current origin
- Admin calls an **absolute origin** from `NEXT_PUBLIC_API_URL`, then appends `/v1`

So the final pattern is:

- `<NEXT_PUBLIC_API_URL>/v1/...`

Examples:

- Correct same-origin production setup:
  - `https://example.com/v1/tools?pageSize=50`
- Incorrect fallback:
  - `http://localhost:4000/v1/tools?pageSize=50`

## Whether nginx Exposes That API Path

Yes. Production nginx exposes both:

- `/api`
- `/v1`

See:

- [production.conf](F:\project\ai-tool-cms\docker\nginx\conf.d\production.conf)

Relevant routes:

- `location /api { proxy_pass http://api:4000; }`
- `location /v1 { proxy_pass http://api:4000; }`

So nginx does expose the admin’s intended API path format, as long as the browser requests the site origin and not `localhost:4000`.

## Whether Failures Are Due To CORS, Wrong Base URL, Missing Token, Or 401

### Most likely: wrong base URL

Evidence strongly points to wrong base URL as the primary issue:

- client default is `http://localhost:4000`
- admin fetches use absolute URL
- production nginx already exposes `/v1`
- browser error string is `Failed to fetch`, which matches a network-level failure better than an API response failure

### Not the primary issue: nginx path exposure

nginx production config already exposes `/v1`, so missing upstream path is not the main problem.

### Possible secondary issue: missing token

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts) reads `window.localStorage.getItem("atcms_jwt")`
- [apps/admin/src/components/rbac/auth-provider.tsx](F:\project\ai-tool-cms\apps\admin\src\components\rbac\auth-provider.tsx) uses a mock permission user for UI gating
- UI permissions are mocked, but API auth is real

This means:

- page navigation can succeed without real login
- API requests still need a real JWT in `localStorage`

If the base URL were correct but token missing, the likely symptom would be:

- `401 Unauthorized`
- not a browser-level `Failed to fetch`

So missing token is a real architectural gap, but it does not best explain the specific reported error text.

### Possible but less likely: CORS

CORS is unlikely to be the primary issue if admin calls same-origin `https://example.com/v1/...`.

If admin is incorrectly calling `http://localhost:4000/v1/...`, the failure may appear as:

- unreachable host
- mixed content
- browser network rejection

That can look like CORS from the UI perspective, but the underlying issue is still the wrong absolute API origin.

## Exact Failing URL

Most likely failing production URLs:

- `http://localhost:4000/v1/tools?pageSize=50`
- `http://localhost:4000/v1/categories?pageSize=50`
- `http://localhost:4000/v1/users?pageSize=50`
- `http://localhost:4000/v1/users/summary`
- `http://localhost:4000/v1/settings?pageSize=50`
- `http://localhost:4000/v1/settings/summary`

These come from:

- default `NEXT_PUBLIC_API_URL = http://localhost:4000`
- admin API base appending `/v1`

## Affected Files

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)
- [packages/config/src/client.ts](F:\project\ai-tool-cms\packages\config\src\client.ts)
- [apps/admin/next.config.ts](F:\project\ai-tool-cms\apps\admin\next.config.ts)
- [docker/Dockerfile.next](F:\project\ai-tool-cms\docker\Dockerfile.next)
- [docker-compose.prod.yml](F:\project\ai-tool-cms\docker-compose.prod.yml)
- [docker/nginx/conf.d/production.conf](F:\project\ai-tool-cms\docker\nginx\conf.d\production.conf)
- [\.env.production.example](F:\project\ai-tool-cms\.env.production.example)
- [packages/config/src/schema.ts](F:\project\ai-tool-cms\packages\config\src\schema.ts)
- [apps/api/src/app.module.ts](F:\project\ai-tool-cms\apps\api\src\app.module.ts)
- [apps/api/src/auth/auth.controller.ts](F:\project\ai-tool-cms\apps\api\src\auth\auth.controller.ts)
- [apps/api/src/auth/auth.service.ts](F:\project\ai-tool-cms\apps\api\src\auth\auth.service.ts)
- [apps/admin/src/components/rbac/auth-provider.tsx](F:\project\ai-tool-cms\apps\admin\src\components\rbac\auth-provider.tsx)

## Recommended Fix

### Primary fix

Ensure admin is built with the correct public API origin so the client bundle requests same-origin production URLs.

Recommended target behavior:

- admin should request `https://your-domain/v1/...`
- or another valid production API origin, but not `localhost:4000`

### Deployment fix direction

1. Pass `NEXT_PUBLIC_API_URL` at admin image build time, not only container runtime.
2. Prefer same-origin production value such as:
   - `NEXT_PUBLIC_API_URL=https://example.com`
3. Keep nginx exposing `/v1` as it already does.

### Secondary fix

Add a real admin login/token bootstrap flow, or at minimum ensure deploy/runbook includes:

- how `atcms_jwt` is obtained
- where it is stored
- how admin pages behave when token is missing

Right now the UI uses mock RBAC user state while the API requires real JWT auth, which makes the shell appear usable even when data APIs cannot authenticate.

## Final Assessment

The most likely root cause is:

- the production admin browser bundle is using `http://localhost:4000/v1/...` as its API base

Why this matches the symptom:

- pages themselves still load from nginx/admin
- every data panel fails only when client-side fetch runs
- browser reports `Failed to fetch` instead of a normal API response error

If that base URL is corrected, the next likely issue to verify is:

- whether `atcms_jwt` exists and whether the API returns `401`

So the recommended debugging order is:

1. Inspect actual browser network requests from `/admin/tools`
2. Confirm whether request URL is `http://localhost:4000/v1/...`
3. Fix build-time `NEXT_PUBLIC_API_URL`
4. Re-test for any remaining `401 Unauthorized` caused by missing JWT
