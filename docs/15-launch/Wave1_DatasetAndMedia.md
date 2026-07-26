# Release Candidate Sprint 3 Wave 1 - Dataset and Media Coverage

Date: 2026-07-04
Project: AI Tool CMS
Phase: Release Candidate Sprint 3
Scope: Production Dataset + Media Coverage

## Executive Summary

This wave focused on the launch blockers around:

- production dataset size and quality
- logo and screenshot coverage
- content completeness evidence

Final result:

- Dataset: **FAIL**
- Media: **FAIL**
- Content: **FAIL**

The repository now has one useful launch-readiness hardening change:

- fake/demo bulk seed profiles are now blocked by default unless `ALLOW_FAKE_SEED=true` is explicitly set

This reduces the risk of accidentally polluting a launch environment with `AI Tool N` and `example.com` records.

## What Was Verified

### Fresh code audit

Verified files:

- `prisma/seed.ts`
- `prisma/seeds/curated-tools.ts`
- `prisma/seeds/bulk.ts`
- `prisma/seeds/public-catalog.ts`
- `docs/import/first-50-ai-tools.json`
- `apps/api/src/content/content.service.ts`
- `packages/automation/src/tool-logo.ts`
- `packages/screenshot/src/capture.ts`

### Runtime evidence availability

Attempted to refresh live API evidence through:

- `http://localhost/v1/content/dataset`
- `http://localhost/v1/content/quality`
- `http://localhost/v1/content/missing-content`

Current machine state:

- `localhost` API was not reachable
- Docker daemon was not running, so production Compose could not be started in this wave

Because of that, this report uses:

- latest verified runtime evidence from `docs/15-launch/Batch2_DatasetVerification.md`
- latest verified operations/security evidence from Batch 5 and Batch 6
- fresh repository/code audit performed in this wave

## Implementation Completed In This Wave

### 1. Launch seed hardening

Updated:

- `prisma/seed.ts`

Change:

- `SEED_PROFILE=bulk` and `SEED_PROFILE=all` are now blocked by default
- they only run when `ALLOW_FAKE_SEED=true` is explicitly set

Why this matters:

- `prisma/seeds/bulk.ts` creates fake `AI Tool N` records
- `prisma/seeds/bulk.ts` uses `https://example.com/tools/...`
- `prisma/seeds/public-catalog.ts` also contains `.example.com` URLs and placeholder catalog content

This does not solve the dataset scale gap, but it does prevent accidental regression of launch data quality.

## Dataset Verification

### Result: FAIL

### Target

- `200-300` real AI tools for v1.0

### Current state

Based on the latest verified dataset report:

- real tools in active dataset: `50`
- duplicate slug groups: `0`
- duplicate website groups: `0`
- obvious fake/example patterns in active curated dataset: `0`

### Why it failed

The launch target requires `200-300` real tools. The current curated dataset only contains `50`.

### Important findings

- `docs/import/first-50-ai-tools.json` is real-curated and usable
- `prisma/seeds/bulk.ts` is fake/demo-only and not launch-safe
- `prisma/seeds/public-catalog.ts` is also not launch-safe because it generates `.example.com` URLs and synthetic content

### Affected files

- `docs/import/first-50-ai-tools.json`
- `prisma/seeds/curated-tools.ts`
- `prisma/seeds/bulk.ts`
- `prisma/seeds/public-catalog.ts`
- `prisma/seed.ts`

### Recommended fix

1. Build a real launch pack for `200-300` tools.
2. Keep fake/demo seed paths isolated from production use.
3. Re-run dataset verification on the actual imported launch database.

## Media Verification

### Result: FAIL

### Targets

- logo coverage `>=95%`
- screenshot coverage `>=70%`

### Current state

Latest verified coverage from Batch 2:

- logo coverage: `12%`
- screenshot coverage: `0%`

### What exists in code

Logo pipeline exists:

- worker queue: `TOOL_LOGO_COLLECT`
- discovery order includes:
  - stored logo
  - `/favicon.ico`
  - touch icons / linked icons
  - `og:image`
  - visible logo image

Screenshot pipeline exists:

- worker queue: `SCREENSHOT_CAPTURE`
- Playwright capture supports:
  - `DESKTOP`
  - `MOBILE`
  - `DARK`

### Why it still failed

- the pipeline exists, but coverage in the verified launch dataset is still below threshold
- this wave could not re-run live collection because local API/worker stack was unavailable
- no fresh successful logo/screenshot batch run evidence was generated in this wave

### Affected files

- `packages/automation/src/tool-logo.ts`
- `packages/screenshot/src/capture.ts`
- `apps/worker/src/automation-worker.ts`
- `apps/api/src/tools/tools.controller.ts`
- `apps/api/src/tools/tools.service.ts`

### Recommended fix

1. Start the production stack and run bulk logo refresh for the launch dataset.
2. Run screenshot capture for the launch dataset.
3. Store only validated assets.
4. Re-run UI verification on:
   - Public Tool Card
   - Public Tool Detail
   - Admin Tool List
   - Admin Tool Edit

## Content Completeness Verification

### Result: FAIL

### Metrics baseline

From the latest verified dataset/content reports:

- average content score: `75`
- average SEO score: `79`
- average completeness score: `68`
- average readability: `85`

Coverage baseline:

- description: `100%`
- features: `100%`
- FAQ: `100%`
- SEO metadata: `100%`
- logo: `12%`
- screenshots: `0%`
- alternatives: `0%`

### Interpretation

The current curated 50-tool set is strong on:

- summaries
- descriptions
- features
- FAQs
- SEO base fields

It is weak on:

- logos
- screenshots
- alternatives

### Broken content evidence

Latest verified reports indicate:

- broken websites: `0` from existing monitor/status evidence
- broken stored logo URL format: `0`
- missing stored logos: `44`
- missing screenshots: `50`

### Affected files

- `apps/api/src/content/content.service.ts`
- `docs/15-launch/Batch2_DatasetVerification.md`
- `docs/import/first-50-ai-tools.json`

### Recommended fix

1. Re-run quality scoring after logo/screenshot collection.
2. Add or compute alternatives for launch tools.
3. Re-run:
   - missing content report
   - broken link report
   - broken image report

## PASS / FAIL Summary

| Area | Result | Reason |
| --- | --- | --- |
| Dataset | FAIL | Only 50 real tools; launch target is 200-300 |
| Media | FAIL | Logo coverage 12%, screenshot coverage 0% |
| Content | FAIL | Text quality is decent, but completeness is still below launch threshold |

## Launch Blockers Still Open After This Wave

### P0-1 Launch dataset size

- still below target

### P0-2 Logo coverage

- still below target

### P0-3 Screenshot coverage

- still below target

### P0-4 Live media verification

- not refreshed in this wave because local runtime was unavailable

## Next Recommended Batch

Execute the following in order:

1. Bring up production Compose and refresh live API evidence.
2. Import a real `200-300` tool launch pack.
3. Run bulk logo collection.
4. Run screenshot capture.
5. Re-run dataset/media/content verification.

## Final Decision

This wave improved launch safety by blocking accidental fake/demo bulk seeding, but it did **not** close the launch blockers.

Wave 1 result: **FAIL**
