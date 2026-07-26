# Admin Local Demo Login Fix

Date: 2026-07-04
Project: AI Tool CMS
Scope: Admin local Docker demo login routing

## Problem

In local Docker demo mode, Admin login could fail with:

- `Failed to fetch`

The browser-side login request was using an absolute API origin instead of the nginx public origin.

Examples of wrong targets:

- `http://localhost:4000/v1/auth/login`
- `http://localhost:3001/v1/auth/login`
- `http://api:4000/v1/auth/login`

## Root Cause

Local demo `.env.production` still set:

- `NEXT_PUBLIC_API_URL=http://localhost:4000`

That value was injected into the Admin browser build, so the API client preferred an absolute origin instead of using the nginx-routed relative path.

## Fix Applied

### Environment fix

Updated local demo container wiring in `docker-compose.prod.yml`:

- Admin build arg `NEXT_PUBLIC_API_URL` is forced to `""`
- Admin runtime env `NEXT_PUBLIC_API_URL` is forced to `""`

This makes the local Docker demo default to relative browser-side API requests even if a local `.env.production` still contains an absolute API origin.

### Browser-side safety fix

Updated `apps/admin/src/lib/api.ts`:

- browser-side `normalizeApiOrigin()` now treats these as invalid browser API origins for local demo:
  - `localhost:4000`
  - `localhost:3001`
  - `api:4000`
- when detected, the Admin client falls back to relative `/v1`

## Expected Result

Browser-side Admin requests should resolve through nginx as:

- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `GET /v1/tools`
- `GET /v1/categories`

In the browser Network panel, local demo login should appear as:

- `http://localhost/v1/auth/login`

## Files Changed

- `apps/admin/src/lib/api.ts`
- `docker-compose.prod.yml`
- `docs/deployment/AdminLocalDemoLoginFix.md`

## Notes

- This fix only targets local Docker demo API routing.
- It does not redesign Admin auth.
- It preserves relative browser-side API routing through nginx, which is the correct production-like behavior for local demo.
