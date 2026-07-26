# Auto Discovered Tools Review - 2026-07-08

## Summary

- Source pipeline: existing `packages/auto-update`
- Dry-run snapshot: `storage/auto-update/candidates/auto-update-2026-07-08-031044-multi-5.json`
- Raw creatable candidates: `85`
- Import-ready records after domain filtering and platform-host exclusion: `49`
- Validation result: passed via `scripts/auto-update/validate-review-dataset.mjs`

## Source Breakdown

- `futurepedia`: fetched `7`, create `7`
- `taaft`: fetched `50`, create `44`, skip `6`
- `github-trending`: fetched `8`, create `8`
- `huggingface-spaces`: fetched `24`, create `24`
- `hackernews`: fetched `2`, create `2`

## Remaining Category Gaps

The current dry-run still has `6` skipped tools because category mapping is missing:

1. `WiFi Analyser`
2. `WebsitePublisher AI`
3. `Web Hosting | Hostinger`
4. `VPS Hosting | Hostinger`
5. `Monkey Eating Mango`
6. `Specifys.ai`

These need either:

- a more specific category rule, or
- an explicit exclusion rule if they are not a strong fit for the public AI tools directory.

## Why 85 Did Not Become 85 Import-Ready Records

The validator intentionally rejects multiple tools that share the same official host domain, because the project rule is to avoid duplicate tools by website domain.

Main causes:

- Many `huggingface-spaces` records share `huggingface.co`
- Many `github-trending` and `hackernews` records share `github.com`
- Several `Hostinger` entries share `www.hostinger.com`

Because of that, the exporter now filters out platform-host candidates and keeps only one record per remaining hostname for import review.

## Generated Files

- Review dataset: `docs/import/auto-discovered-tools-2026-07-08.json`
- Review notes: `docs/import/auto-discovered-tools-2026-07-08.md`

## Commands

```bash
pnpm --filter @ai-tool-cms/common build
pnpm --filter @ai-tool-cms/auto-update tools:auto-update -- --mode=manual-review --limit=50 --source=taaft --source=futurepedia --source=github-trending --source=huggingface-spaces --source=hackernews --dry-run
pnpm tools:auto-update:export-review storage/auto-update/candidates/auto-update-2026-07-08-031044-multi-5.json
pnpm tools:auto-update:validate-review docs/import/auto-discovered-tools-2026-07-08.json
```

## Next Recommendations

1. Expand `Futurepedia` beyond homepage cards into more category pages and paginated discovery pages.
2. Add explicit exclusion rules for generic hosting, travel, and non-AI utility pages.
3. Keep `github-trending` and `huggingface-spaces` as discovery-only sources unless an official standalone website can be resolved.
4. Add a second-stage resolver that upgrades platform URLs to official product websites when available.
5. Continue until the import-ready dataset reaches at least `200` unique official domains.
