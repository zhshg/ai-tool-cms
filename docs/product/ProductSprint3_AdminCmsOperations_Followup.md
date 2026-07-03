# Product Sprint 3 - Admin CMS Operations Follow-up

## Summary

This follow-up removes inline editing from Admin Tools and Categories list pages, introduces dedicated create/edit routes, and fixes the safe pagination issue that caused the tools list to fail with `400 pageSize`.

## Changes Completed

### Dedicated CMS Pages

Added dedicated routes:

- `/admin/tools/new`
- `/admin/tools/[id]/edit`
- `/admin/categories/new`
- `/admin/categories/[id]/edit`

List pages now only contain:

- summary cards
- table view
- `New` button
- `Edit` action link
- `Delete` action

Removed inline create/edit forms from:

- `/admin/tools`
- `/admin/categories`

### Safe Pagination Fix

Fixed Admin list pagination to stay within backend DTO limits:

- Tools list remains on `pageSize=50`
- Categories list remains on `pageSize=50`
- Users list remains on `pageSize=50`
- Settings list remains on `pageSize=50`
- Tags fetch reduced from `pageSize=200` to `pageSize=100`

This resolves the Tools page failure caused by the tags request exceeding the backend `pageSize <= 100` limit.

## Files Modified

### Admin Pages

- `apps/admin/src/app/(dashboard)/tools/page.tsx`
- `apps/admin/src/app/(dashboard)/tools/new/page.tsx`
- `apps/admin/src/app/(dashboard)/tools/[id]/edit/page.tsx`
- `apps/admin/src/app/(dashboard)/categories/page.tsx`
- `apps/admin/src/app/(dashboard)/categories/new/page.tsx`
- `apps/admin/src/app/(dashboard)/categories/[id]/edit/page.tsx`

### Admin Components

- `apps/admin/src/components/tools/tool-editor-form.tsx`
- `apps/admin/src/components/categories/category-editor-form.tsx`

### Admin API Client

- `apps/admin/src/lib/api.ts`

## Verification

Static checks passed:

- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/admin typecheck`

Production container verification passed:

- `/admin/tools` returns `200`
- `/admin/tools/new` returns `200`
- `/admin/tools/[id]/edit` returns `200`
- `/admin/categories/new` returns `200`
- `/admin/categories/[id]/edit` returns `200`

Interactive API verification passed:

- Tool create works
- Tool edit works
- Tool delete works
- Category create works
- Category edit works
- Category delete works

## Notes

- Public web pages were not modified.
- Auth / JWT behavior was kept unchanged.
- Existing CRUD APIs were reused.
- Save actions redirect back to list pages.
- Cancel actions return to list pages.

## Result

This follow-up meets the requested outcome:

- Tools and Categories now use dedicated create/edit pages
- Tools list no longer fails due to unsafe pagination
- Admin CMS interactions remain functional
