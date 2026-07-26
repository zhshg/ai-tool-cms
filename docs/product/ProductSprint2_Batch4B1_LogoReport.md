# Product Sprint 2 - Batch 4B.1 Logo Report

## Current Status

- `Tool` model already supports `logoUrl` as an optional field.
- Missing logos are not caused by Prisma schema limits.
- The main gap was frontend fallback behavior and duplicated logo rendering logic.
- Import docs already treat `logo` as optional in practice, but the recommendation was not explicit enough.

## Why Logos Were Missing

- Curated and imported tool records do not guarantee a `logo` value.
- Some frontend surfaces rendered raw `<img>` tags directly.
- Existing fallbacks were inconsistent:
  - tool cards used initials only
  - tool detail used a separate initials fallback
  - category icon fallback was not part of the tool logo chain
  - broken image handling was not centralized

## What Changed

- Added reusable `ToolLogo` component:
  - `apps/web/src/components/tool/tool-logo.tsx`
- Implemented fallback priority:
  - `Tool.logo`
  - generated avatar
  - category icon
  - default AI tool icon
- Added lazy loading and async decoding for logo images.
- Added error handling so broken logo URLs fall through instead of rendering broken images.
- Added dark-mode-safe fallback styling.
- Replaced duplicated logo rendering in:
  - tools directory cards
  - category landing tool cards
  - tool detail hero
  - similar tools on tool detail

## Data Layer Updates

- Extended tool view models so frontend can access category icon fallbacks where needed.
- Category-linked tool records now expose `categoryIconUrl` for fallback rendering.

## Import Strategy Notes

- `logo` remains optional.
- Recommended but not required for CSV/JSON/manual import.
- Missing logos should never block import if required business fields are valid.

## Acceptance Check

- Every tool card now has an icon path.
- Every tool detail page now has an icon path.
- Broken logo URLs no longer leave a broken image frame.
- No hardcoded brand images were introduced.
- Fallback chain is centralized in one reusable component.

## Files Modified

- `apps/web/src/components/tool/tool-logo.tsx`
- `apps/web/src/components/category/category-directory.tsx`
- `apps/web/src/components/seo/tool-detail-page.tsx`
- `apps/web/src/app/[locale]/tools/page.tsx`
- `apps/web/src/lib/catalog.ts`
- `apps/web/src/lib/tool-page.ts`

## Remaining Work

- Re-run local frontend verification once the local `.env` issue is fully cleaned up.
- Optionally update import docs/examples to mention logo recommendation more prominently in Batch 4 import authoring guides.
