# RC Sprint 3 Launch Readiness Execution Plan

Date: 2026-07-04
Project: AI Tool CMS
Phase: Release Candidate Sprint 3
Purpose: Execute the remaining launch blockers to move `LaunchCandidate3` from `NO` to `YES`

## Goal

This plan converts the remaining 4 `P0` launch blockers into executable delivery batches.

Current blockers:

1. Production dataset does not meet launch target
2. Production import workflow is not durable
3. Production environment is not externally ready
4. Restore readiness is not proven

This is an execution plan, not a status report. Every batch below has:

- objective
- concrete scope
- implementation boundary
- verification gate
- exit criteria

## Launch Standard

`Launch Ready = YES` is allowed only when all of the following are true:

- current HEAD verification passes again on the latest commit
- production Docker build and startup pass
- Public, Admin, API, Worker, and Scheduler smoke tests pass
- production dataset target is met and documented
- import workflow verification passes
- Lighthouse targets still pass
- no Critical security issues remain
- production environment verification passes
- restore drill is completed and documented

## Execution Strategy

The 4 blockers should be executed in sequence, but with partial parallelism:

- Track A: Data and import
- Track B: Production environment and recovery proof

Recommended order:

1. Batch E1 - Production Dataset Expansion
2. Batch E2 - Logo and Screenshot Coverage Closure
3. Batch E3 - Durable Import Workflow
4. Batch E4 - External Production Environment Readiness
5. Batch E5 - Backup Restore Drill
6. Batch E6 - Final Re-verification and Launch Gate Re-run

## Batch E1 - Production Dataset Expansion

### Objective

Expand the launch dataset from the current 50 real tools to the first launch-ready production scale.

### Required Output

- at least `500` real AI tools
- no fake/example/demo records
- no duplicate slug
- no duplicate website
- every tool has at minimum:
  - `name`
  - `slug`
  - `website`
  - `summary`
  - `description`
  - `primary category`
  - `tags`
  - `pricing`
  - `status`

### Scope

- curate real-tool source files
- normalize field mapping
- validate duplicates before import
- define launch scale explicitly if first launch chooses `<500`

### Implementation Boundary

- allowed: import data packs, validation scripts, audit docs
- not allowed: fake/generated tools, placeholder websites, lorem text

### Dependencies

- existing import specification
- category/tag taxonomy
- current curated 50-tool dataset

### Verification

- rerun dataset verification
- SQL/API duplicate checks
- fake/example pattern detection
- content summary count verification

### Exit Criteria

- `docs/15-launch/Batch2_DatasetVerification.md` can be regenerated as `PASS`
- launch dataset size is explicitly documented

## Batch E2 - Logo and Screenshot Coverage Closure

### Objective

Raise dataset completeness to launch threshold.

### Required Output

- logo coverage `>=95%`
- screenshot coverage `>=70%`

### Scope

- run logo collection pipeline
- store collected logo URLs
- manually fill unresolved logo gaps
- run screenshot pipeline or approved upload flow
- keep link-based and stored asset paths consistent

### Implementation Boundary

- allowed: logo refresh, screenshot upload/collection, completeness audit
- not allowed: broken image placeholders presented as valid coverage

### Dependencies

- Batch E1 dataset pack
- existing ToolLogo fallback strategy
- media pipeline/storage path

### Verification

- rerun completeness counters
- verify no broken image URLs
- verify public tool cards and tool detail pages render valid icons/screenshots

### Exit Criteria

- `docs/15-launch/Batch2_DatasetVerification.md` logo and screenshot thresholds pass
- missing-logo and missing-screenshot counts fall below launch thresholds

## Batch E3 - Durable Import Workflow

### Objective

Upgrade the current sync import flow into a production-grade import system.

### Required Output

- CSV import
- JSON import
- Remote URL import
- preview
- dry run
- real import
- import history
- job detail
- resume
- retry
- cancel
- rollback
- downloadable error report
- accurate import statistics

### Scope

- persistent import job model
- row-level result tracking
- queue-backed execution
- admin history/detail UI
- remote URL fetch with validation and SSRF-safe rules

### Implementation Boundary

- allowed: minimal schema additions required for durable imports
- not allowed: weakening validation or skipping duplicate controls to “force pass”

### Dependencies

- queue infrastructure
- admin import page
- tool import parser/validator

### Verification

- dry run with large real dataset
- real import into clean or staging database
- duplicate handling verification
- resume/retry/cancel verification
- rollback verification
- downloadable error report verification

### Exit Criteria

- `docs/15-launch/Batch3_ImportVerification.md` can be regenerated as `PASS`
- import is proven with real production-scale data, not synthetic rows

## Batch E4 - External Production Environment Readiness

### Objective

Replace local placeholder production settings with a real externally reachable production environment.

### Required Output

- real production domain
- HTTPS enabled
- SSL verified
- DNS verified
- Cloudflare configured if used
- Search Console configured
- Bing Webmaster configured
- IndexNow configured
- monitoring sink configured
- alert routing configured

### Scope

- update production env values from `localhost` to real domain
- configure public origins
- configure TLS termination
- validate nginx or edge behavior
- connect webmaster tools
- connect observability provider(s)

### Implementation Boundary

- allowed: deployment/env/nginx/doc changes
- not allowed: marking third-party systems complete without real verification evidence

### Dependencies

- deploy target
- domain ownership
- DNS control
- secret management

### Verification

- browser verification against real domain
- HTTPS certificate verification
- DNS resolution checks
- Search Console property verification
- Bing site verification
- IndexNow submission verification
- monitoring/alert test event verification

### Exit Criteria

- `docs/15-launch/Batch7_ProductionEnvironment.md` can be regenerated as `PASS`
- `.env.production` or deployment secret set is no longer `localhost`-based

## Batch E5 - Backup Restore Drill

### Objective

Prove that backup is recoverable, not just documented.

### Required Output

- one successful backup run
- one verified restore drill
- one rollback drill or equivalent rollback proof

### Scope

- generate backup artifact
- restore into staging/recovery target
- validate restored application/data state
- record duration, operator, source snapshot, and validation result

### Implementation Boundary

- allowed: backup scripts, restore scripts, runbook/report updates
- not allowed: “assumed successful” restore without evidence

### Dependencies

- data snapshot
- staging or recovery environment
- documented rollback procedure

### Verification

- restore output logs
- post-restore health checks
- key table count comparisons
- application smoke after restore

### Exit Criteria

- restore drill is documented as completed
- rollback evidence is archived

## Batch E6 - Final Re-verification and Launch Gate Re-run

### Objective

Re-run the complete release gate on the newest HEAD after E1-E5 are complete.

### Required Output

- fresh current HEAD verification
- fresh Docker production build/startup verification
- fresh Public/Admin/API/Worker/Scheduler smoke
- fresh dataset verification
- fresh import verification
- fresh performance check
- fresh security critical gate check
- fresh production environment verification
- updated `LaunchCandidate3.md`

### Scope

- rerun all RC Sprint 3 launch documents that were previously `FAIL` or `WARN`
- regenerate final board decision from fresh evidence only

### Verification

- all previously failed batches become `PASS`
- remaining warns are explicitly non-blocking

### Exit Criteria

- `docs/15-launch/LaunchCandidate3.md` updated from fresh evidence
- `Launch Ready = YES`

## Suggested Work Breakdown

### Wave 1

- E1 dataset expansion
- E2 coverage closure

### Wave 2

- E3 durable import workflow

### Wave 3

- E4 external production environment
- E5 restore drill

### Wave 4

- E6 full re-verification

## Ownership Suggestion

| Batch | Primary Owner | Supporting Owner |
| --- | --- | --- |
| E1 | Data / Content | Product |
| E2 | Media / Content | Web |
| E3 | Backend | Admin / Worker |
| E4 | DevOps | SEO / Security |
| E5 | DevOps / DBA | Backend |
| E6 | QA / Release | All owners |

## Hard Stop Rules

The team should not mark launch-ready if any of the following is still true:

- dataset is below agreed launch size
- logo or screenshot thresholds fail
- import history/resume/retry/cancel/rollback are missing
- production still points to `localhost`
- HTTPS or DNS is not verified
- restore drill is not completed
- final launch gate is based on stale reports instead of fresh verification

## Immediate Next Step

Start with `Batch E1` and `Batch E2` together, because they unblock both:

- dataset verification
- launch content completeness
- realistic import-scale validation for `Batch E3`
