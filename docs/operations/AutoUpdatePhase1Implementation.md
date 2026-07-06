# Auto Update Phase 1 Implementation

## Scope

This phase delivers a safe `manual-review` pipeline for discovering AI tools without writing production data.

## Current Status

- Default mode remains `manual-review`
- No production `apply` is enabled
- No delete, archive, or overwrite behavior is enabled
- Candidate snapshots, markdown reports, and logs are generated for each run
- Same-day runs no longer overwrite each other
- Frontend analytics can be configured through `NEXT_PUBLIC_GA_ID`

## Verified Sources

- `github-trending`
- `hackernews`
- `huggingface-spaces`
- `futurepedia`
- `taaft`

## Key Implementation Notes

- Windows fetch fallback was hardened for environments where direct Node fetch, `curl.exe`, or PowerShell TLS can fail intermittently
- `futurepedia` now parses homepage cards instead of relying on the old API route
- `taaft` now parses homepage listing rows instead of relying on the blocked API route
- `hackernews` now filters for tool-like AI items instead of broad AI news
- Category heuristics were extended so common tool descriptions resolve into the existing whitelist
- Run artifacts now include date, time, and source summary in filenames

## Reliable Command

Use this command when `pnpm run` is blocked locally:

```bash
node node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/cli.mjs packages/auto-update/src/cli.ts --mode=manual-review --limit=10 --source=github-trending --source=hackernews --source=huggingface-spaces --source=futurepedia --source=taaft
```

## Latest Verified Result

- `dryRun=true`
- `fetched=33`
- `create=33`
- `draft=0`
- `updateEmpty=0`
- `skip=0`
- `warnings=0`

Artifacts:

- `docs/operations/reports/auto-update-2026-07-06-112619-multi-5.md`
- `storage/auto-update/candidates/auto-update-2026-07-06-112619-multi-5.json`
- `logs/auto-update/2026-07-06-112619-multi-5.log`

## Remaining Phase 2 Candidates

- Add stronger source-specific enrichment for homepage-only sources
- Improve category precision beyond regex heuristics
- Add an admin review surface for candidates
- Add a protected path for optional future `safe-auto` rollout
