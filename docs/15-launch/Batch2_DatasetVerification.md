# Release Candidate Sprint 3 Batch 2 - Production Dataset Verification

Date: 2026-07-04
Project: AI Tool CMS
Phase: Release Candidate Sprint 3 - Batch 2
Scope: Production Dataset Verification

## Executive Summary

本批对当前生产 Compose 环境中的 AI Tool 数据集进行了只读验证。

结论：**FAIL**。

当前数据集中有 50 条已发布真实 AI tools，未发现明显 fake/example 数据、重复 slug 或重复 website；features、FAQ、SEO、description 覆盖率达到或超过本批阈值。

但生产发布门槛要求至少 500 条真实 AI tools，且 logo 覆盖率需要 >=95%、screenshots 覆盖率需要 >=70%。当前数据库只有 50 条工具，logo 覆盖率 12%，screenshots 覆盖率 0%，因此不能通过 Production Dataset Verification。

## Verification Sources

| Source | Purpose | Status |
| --- | --- | --- |
| `GET /v1/content/dataset` | Dataset summary, coverage, duplicate and issue summary | PASS |
| `GET /v1/content/duplicates` | Duplicate detection | PASS |
| `GET /v1/content/missing-content` | Missing content report | PASS |
| `GET /v1/content/broken-websites` | Broken website report from existing monitor/status data | PASS |
| `GET /v1/content/quality` | Content score and quality breakdown | PASS |
| Read-only PostgreSQL query via production Compose | Fake/example pattern, duplicate slug/website, logo URL sanity | PASS |

## Acceptance Summary

| Requirement | Target | Actual | Result |
| --- | ---: | ---: | --- |
| Real AI tools | >= 500 | 50 | FAIL |
| Fake/example data | 0 | 0 obvious fake/example patterns | PASS |
| Duplicate slug | 0 | 0 duplicate groups | PASS |
| Duplicate website | 0 | 0 duplicate groups | PASS |
| Logo coverage | >= 95% | 12% | FAIL |
| Features coverage | >= 90% | 100% | PASS |
| FAQ coverage | >= 80% | 100% | PASS |
| Screenshots coverage | >= 70% | 0% | FAIL |
| Broken websites | 0 launch blockers | 0 from existing monitor/status report | PASS with limitation |
| Broken logo URLs | 0 invalid stored logo URLs | 0 invalid stored logo URLs; 44 missing logos | WARN |
| Average Content Score | launch quality benchmark | 75 / 100 | WARN |

## Dataset Summary

| Metric | Value |
| --- | ---: |
| Total tools | 50 |
| Published tools | 50 |
| Draft tools | 0 |
| In review tools | 0 |
| Archived tools | 0 |
| Average Content Score | 75 |
| Average SEO Score | 79 |
| Average Completeness Score | 68 |
| Average Readability | 85 |
| Excellent tools | 0 |
| Needs improvement | 0 |

## Coverage Report

| Field | Covered | Missing | Coverage | Required | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Logo | 6 | 44 | 12% | 95% | FAIL |
| Description | 50 | 0 | 100% | Required | PASS |
| Features | 50 | 0 | 100% | 90% | PASS |
| FAQ | 50 | 0 | 100% | 80% | PASS |
| Screenshots | 0 | 50 | 0% | 70% | FAIL |
| SEO metadata | 50 | 0 | 100% | Required | PASS |
| Categories | 50 | 0 | 100% | Required | PASS |
| Tags | 50 | 0 | 100% | Required | PASS |
| Pricing | 50 | 0 | 100% | Required | PASS |
| Use cases | 48 | 2 | 96% | Required | WARN |
| Alternatives | 0 | 50 | 0% | Recommended | WARN |

## Duplicate Detection

| Check | Result |
| --- | ---: |
| Duplicate groups from `/v1/content/duplicates` | 0 |
| Duplicate tools from `/v1/content/duplicates` | 0 |
| Duplicate slug groups from SQL normalized check | 0 |
| Duplicate website groups from SQL normalized check | 0 |

Result: **PASS**.

## Fake / Example Data Detection

Read-only SQL checks looked for obvious fake/demo patterns:

- Tool names matching `fake`, `demo`, `sample`, `example`, `lorem`, or `AI Tool N`.
- Websites matching `example.com`, `localhost`, or `127.0.0.1`.

| Check | Count | Result |
| --- | ---: | --- |
| Fake/demo/sample/example/lorem/AI Tool N names | 0 | PASS |
| `example.com` / localhost websites | 0 | PASS |

Result: **PASS with scope limitation**.

This confirms there is no obvious synthetic/demo data pattern in the active tool table. It does not prove that every description was independently editorially reviewed.

## Broken Website Detection

`GET /v1/content/broken-websites` returned:

| Metric | Value |
| --- | ---: |
| Broken website items | 0 |

Result: **PASS with limitation**.

Limitation: the current API note states that broken website detection uses URL validation and existing `WebsiteMonitor` status. It does not scrape or live-fetch website content during this verification run.

## Broken Logo Detection

| Check | Count | Result |
| --- | ---: | --- |
| Missing stored logo | 44 | FAIL |
| Invalid stored logo URL format | 0 | PASS |
| Stored logo coverage | 12% | FAIL |

Result: **FAIL** because the dominant issue is not broken stored logo URLs; it is missing logos.

Top examples missing logo:

| Tool | Slug | Website |
| --- | --- | --- |
| Harvey | `harvey` | `https://www.harvey.ai` |
| Photoroom | `photoroom` | `https://www.photoroom.com` |
| Adobe Firefly | `adobe-firefly` | `https://www.adobe.com/products/firefly.html` |
| Figma AI | `figma-ai` | `https://www.figma.com/ai/` |
| Beautiful.ai | `beautiful-ai` | `https://www.beautiful.ai` |
| Tome | `tome` | `https://tome.app` |
| Gamma | `gamma` | `https://gamma.app` |
| Fireflies | `fireflies` | `https://fireflies.ai` |
| Otter | `otter` | `https://otter.ai` |
| Speechify | `speechify` | `https://speechify.com` |

## Missing Content Report

| Missing Content Type | Count | Impact |
| --- | ---: | --- |
| Logo | 44 | P0 for dataset launch quality |
| Description | 0 | None |
| Features | 0 | None |
| FAQ | 0 | None |
| Screenshots | 50 | P0 for visual completeness target |
| SEO | 0 | None |
| Categories | 0 | None |
| Tags | 0 | None |
| Pricing | 0 | None |
| Use Cases | 2 | P2 |
| Alternatives | 50 | P1/P2 depending launch UX requirements |

## Content Score

| Metric | Score |
| --- | ---: |
| Average Content Score | 75 |
| Average SEO Score | 79 |
| Average Completeness Score | 68 |
| Average Readability | 85 |

Interpretation:

- Text quality and base metadata are acceptable for the initial 50-tool curated set.
- Completeness is pulled down by missing logos, screenshots, and alternatives.
- No tools reached the `excellentTools` threshold in the quality dashboard.

Top missing-content examples from the quality dashboard include:

| Tool | Content Score | Main Missing Items |
| --- | ---: | --- |
| Gamma | 73 | logo, FAQ depth, screenshots, alternatives |
| Fireflies | 73 | logo, FAQ depth, screenshots, alternatives |
| Otter | 73 | logo, FAQ depth, screenshots, alternatives |
| Murf | 73 | logo, FAQ depth, screenshots, alternatives |
| CapCut | 73 | logo, FAQ depth, screenshots, alternatives |

## Launch Blockers

### P0 - Dataset Scale

The current active dataset contains only 50 tools. The requirement is at least 500 real AI tools.

Recommended fix:

- Import and verify at least 450 additional real AI tools.
- Use the production import pipeline with duplicate detection and dry run.
- Re-run this verification after import.

### P0 - Logo Coverage

Logo coverage is 12%, far below the 95% target.

Recommended fix:

- Run the production logo pipeline for all 50 existing tools first.
- Apply manual logo overrides where automated collection fails.
- Require logo or collected logo for the 450+ additional production tools.

### P0 - Screenshot Coverage

Screenshot coverage is 0%, below the 70% target.

Recommended fix:

- Run screenshot capture/upload pipeline for current tools.
- For tools where screenshots cannot be safely collected, use approved uploaded screenshots or hide screenshots on public detail pages.
- Define whether screenshot coverage target applies to stored screenshots only or safe public detail fallback imagery.

## Recommended Backlog

| Priority | Item | Recommended Action |
| --- | --- | --- |
| P0 | Expand real dataset to 500+ | Import verified real tools, no fake/example records, run duplicate checks before publish |
| P0 | Raise logo coverage to >=95% | Run logo refresh queue, store collected logos, manually fill failures |
| P0 | Raise screenshot coverage to >=70% | Run screenshot pipeline or upload approved screenshots |
| P1 | Add live broken website/link audit evidence | Run safe HTTP status verification or website monitor jobs and persist results |
| P1 | Add alternatives coverage | Generate related alternatives from shared tags/categories/pricing and persist or compute reliably |
| P2 | Fill remaining use cases | Add use cases for the 2 tools missing them |
| P2 | Improve quality score threshold | Target average Content Score >=85 and excellent tools >60% before commercial launch |

## Final Decision

| Item | Result |
| --- | --- |
| Production Dataset Verification | FAIL |
| Primary reason | Dataset size, logo coverage, and screenshot coverage do not meet launch targets |
| Can proceed to production launch? | NO |
| Can proceed to import/content remediation batch? | YES |
