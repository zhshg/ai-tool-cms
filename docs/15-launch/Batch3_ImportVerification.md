# Release Candidate Sprint 3 Batch 3 - Import Workflow Verification

Date: 2026-07-04
Project: AI Tool CMS
Phase: Release Candidate Sprint 3 - Batch 3
Scope: Production Import Workflow Verification
Verified HEAD: `c29dcff5 docs(content): verify production dataset`

## Executive Summary

本批对当前生产导入链路进行了实现审计和 API smoke 验证。

结论：**FAIL**。

当前系统已经具备基础 Import Center，并支持 CSV/JSON 文件上传、文件预览、Dry Run/Preview、重复检测、同步 Real Import 和导入结果摘要。通过 nginx 访问的生产 API smoke 显示，JSON 和 CSV duplicate-only payload 都能识别现有 `chatgpt` 记录为重复，执行导入时返回 `importedCount=0`、`skippedCount=1`，没有产生重复工具。

但本批要求的是生产级导入工作流，当前实现缺少 Remote URL import、持久化 Import History、Job Detail、Resume、Retry、Cancel、Download Error Report、Rollback，以及 500 条真实工具导入验证。由于当前生产数据集只有 50 条工具，且任务明确禁止 fake data，本批没有也不应生成 500 条假工具来满足验收。

## Verification Sources

| Source | Purpose | Result |
| --- | --- | --- |
| `apps/admin/src/app/(dashboard)/import/page.tsx` | Admin Import Center UI capability review | PASS with gaps |
| `apps/api/src/tools/tools.controller.ts:118` | `POST /v1/tools/import/preview` route | PASS |
| `apps/api/src/tools/tools.controller.ts:125` | `POST /v1/tools/import/execute` route | PASS |
| `apps/api/src/tools/dto/content-ops.dto.ts:68` | import DTO review | PASS with gaps |
| `apps/api/src/tools/dto/content-ops.dto.ts:71` | format limited to `csv` / `json` | FAIL for Remote URL |
| `apps/api/src/tools.service.ts:207` | preview service implementation | PASS |
| `apps/api/src/tools.service.ts:246` | execute service implementation | PASS with gaps |
| `apps/api/src/tools.service.ts:417` | parser limited to synchronous content parsing | WARN |
| `apps/api/src/tools.service.ts:424` | CSV parser uses simple comma split | WARN |
| `prisma/schema.prisma` search | import job/history persistence model | FAIL |
| `docs/15-launch/Batch2_DatasetVerification.md` | current production dataset size and quality baseline | FAIL for 500-tool requirement |
| Production API smoke via `http://localhost/v1` | auth, preview, execute duplicate-only import | PASS |

## Acceptance Matrix

| Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin Import Center exists | PASS | `apps/admin/src/app/(dashboard)/import/page.tsx` | Page supports upload, preview, validation, import, summary states. |
| CSV import | PASS with limitation | UI supports `.csv`; API `format="csv"`; CSV smoke preview passed | Parser is not production-grade for quoted/escaped multi-line CSV because backend uses `headerLine.split(",")`. |
| JSON import | PASS | UI supports `.json`; API `format="json"`; JSON smoke preview and execute passed | JSON array payload is parsed and normalized. |
| Remote URL import | FAIL | DTO only allows `csv/json` content payload | No URL DTO, UI input, queue, fetcher, allowlist, timeout, or remote file validation. |
| Preview before import | PASS | `POST /v1/tools/import/preview` | Returns total records, ready count, duplicates, warnings. |
| Dry Run | PASS with limitation | Admin Preview/Dry Run calls preview endpoint | Dry Run is a preview-only workflow, not a persisted dry-run job. |
| Real Import | PASS with limitation | `POST /v1/tools/import/execute` | Synchronous import exists; no durable job tracking or rollback. |
| Duplicate detection | PASS | Smoke: JSON and CSV duplicate previews returned `duplicates=1` | Detection uses slug or website. |
| Import history | FAIL | No `ImportJob` / `ImportHistory` schema or routes found | Results are response-only and disappear after page/session. |
| Resume interrupted import | FAIL | No persisted job/checkpoint model | Synchronous request cannot resume after interruption. |
| Retry failed import | FAIL | No retry endpoint or failed-row persistence | Requires import job plus row-level failure state. |
| Cancel import | FAIL | No cancel endpoint or async job | Synchronous request cannot be cancelled after dispatch through UI. |
| Job detail | FAIL | No job id returned by execute endpoint | Execute returns only counts and arrays. |
| Statistics | PASS with limitation | Execute returns `importedCount`, `skippedCount`; preview returns `total`, `readyToImport`, `duplicates` | No historical aggregate statistics or per-job durable stats. |
| Download error report | FAIL | No report endpoint or generated artifact | UI shows skipped rows but cannot export error report. |
| Rollback | FAIL | No transaction/job rollback endpoint | Execute creates records one by one; no import batch id to reverse. |
| Import 500 tools | FAIL / NOT EXECUTED | Current production dataset has 50 tools in Batch 2 verification | 500 real tools are not available; fake/generated tools are prohibited. |
| No duplicate after verification smoke | PASS | Duplicate-only execute returned `importedCount=0`, `skippedCount=1` | Smoke intentionally used existing real `ChatGPT` duplicate to avoid data pollution. |
| Correct statistics | PASS with limitation | Smoke response matched expected duplicate-only result | Does not validate large-file/500-row statistics. |
| Correct rollback | FAIL / NOT IMPLEMENTED | No rollback model or API | Cannot verify rollback until implemented. |

## API Smoke Results

The smoke test authenticated with the seeded admin account through nginx and used existing real tool data only. It did not create fake tools.

| Check | Result |
| --- | --- |
| Login via `POST http://localhost/v1/auth/login` | PASS |
| JSON preview duplicate payload for `chatgpt` | `total=1`, `readyToImport=0`, `duplicates=1` |
| JSON execute duplicate payload for `chatgpt` | `importedCount=0`, `skippedCount=1`, reason `Duplicate slug or website` |
| CSV preview duplicate payload for `chatgpt` | `total=1`, `readyToImport=0`, `duplicates=1` |
| Current tool list total | 50 |

## Implementation Findings

### PASS: Basic synchronous import exists

`ToolsController` exposes:

- `POST /v1/tools/import/preview`
- `POST /v1/tools/import/execute`

`ToolsService.previewImport` detects duplicates before write. `ToolsService.executeImport` skips existing slug/website records and returns imported/skipped counts.

### FAIL: Production workflow state is missing

There is no durable import job or import history model in Prisma. Without this, the system cannot support:

- resume
- retry
- cancel
- job detail
- historical statistics
- downloadable error report
- rollback by import batch

Recommended fix: introduce an import domain with `ImportJob`, `ImportJobRow`, `ImportJobEvent`, and optional `ImportRollback` records, then move execution into a queue-backed worker.

### FAIL: Remote URL import is missing

`ImportPreviewDto` accepts only `format` and inline `content`; `format` is restricted to `csv` or `json`. There is no Admin URL input and no backend remote fetcher.

Recommended fix: add a remote import source type with URL validation, content-type checks, size limits, timeout, SSRF protection, and preview-only fetch before import.

### WARN: CSV parser is not production-grade

Backend CSV parsing currently uses simple comma splitting. This is risky for production data because real CSV files commonly contain commas, quotes, newlines, and escaped values.

Recommended fix: use a maintained CSV parser with streaming support and explicit limits.

### FAIL: 500-tool import cannot be verified yet

Batch 2 verified the current production dataset has 50 tools. This batch requires importing 500 tools, but no approved 500-tool real dataset is present. Generating fake tools would violate the release rules.

Recommended fix: land an approved 500+ real-tool dataset first, then run a dry-run job and a real import into a clean/staging database with duplicate and rollback verification.

## P0 / P1 / P2 Issues

| Priority | Issue | Reason | Affected files | Recommended fix |
| --- | --- | --- | --- | --- |
| P0 | Production import workflow lacks durable job/history | Required features Resume, Retry, Cancel, History, Job Detail, Error Report, Rollback are impossible without persisted import state | `apps/api/src/tools/tools.controller.ts`, `apps/api/src/tools/tools.service.ts`, `prisma/schema.prisma`, `apps/admin/src/app/(dashboard)/import/page.tsx` | Add import job schema, queue worker, admin history pages, job detail, row-level error state, and rollback workflow. |
| P0 | 500 real-tool import not verified | Current dataset has 50 tools and fake data is prohibited | `docs/15-launch/Batch2_DatasetVerification.md`, seed/import dataset files | Prepare approved 500+ real dataset and run dry-run + staging import verification. |
| P1 | Remote URL import missing | Required source type is not implemented | `apps/api/src/tools/dto/content-ops.dto.ts`, `apps/admin/src/app/(dashboard)/import/page.tsx` | Add URL source with SSRF-safe fetch, content validation, preview, and import job creation. |
| P1 | CSV parsing is not robust | Simple comma splitting can corrupt real production CSV data | `apps/api/src/tools/tools.service.ts:424` | Replace with streaming CSV parser and row-level validation. |
| P1 | Error report is not downloadable | Admin can view skipped rows only in session | Import Center UI/API | Persist row errors and provide CSV/JSON download endpoint. |
| P2 | Import statistics are response-only | Counts are not stored historically | Import service/schema | Store aggregate stats per import job and expose dashboard metrics. |

## Required Fix Order

1. Add durable import job/history schema and APIs.
2. Move real import execution to a queue-backed worker with cancel/retry/resume support.
3. Add row-level validation, persisted error reports, and downloadable artifacts.
4. Replace backend CSV parser with a robust streaming parser.
5. Add SSRF-safe Remote URL import source.
6. Add rollback by import job/batch id.
7. Prepare an approved 500+ real-tool dataset.
8. Re-run dry-run, real import, duplicate detection, statistics, rollback, and clean database verification.

## Final Decision

| Area | Status |
| --- | --- |
| Basic CSV/JSON preview and duplicate detection | PASS |
| Basic synchronous duplicate-safe execute | PASS with limitation |
| Production import workflow | FAIL |
| 500 real tools import verification | FAIL |
| Rollback verification | FAIL |

**Batch 3 Result: FAIL**

This batch is not launch-ready. The current Import Center is a useful foundation, but it is not yet a production-grade import workflow for 500+ tools with history, resume, retry, cancel, error reports, and rollback.
