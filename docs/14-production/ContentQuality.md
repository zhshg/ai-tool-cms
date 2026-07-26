# Release Candidate Sprint 2 Batch 3 - Content Quality

## Executive Summary

This batch introduces an AI-assisted content quality system for the AI Tool CMS production catalog. The system scores every tool across content quality, SEO readiness, completeness, readability, and launch-critical missing fields without adding new database schema.

The implementation reuses existing Tool, Category, Tag, PricingPlan, FAQ, ToolScreenshot, metadata, and AI pipeline infrastructure. Quality results are calculated on demand from real stored content and exposed to the Admin Content Dashboard.

## Goals

- Assign every tool a Content Score.
- Assign every tool an SEO Score.
- Assign every tool a Completeness Score.
- Assign every tool a Readability score.
- Provide a Quality Breakdown by content dimension.
- Surface Top Missing Content in Admin.
- Surface Quality Ranking in Admin.
- Provide Bulk Improve workflow through the existing AI pipeline.

## Scoring Model

### Content Score

Content Score is a weighted launch-quality score:

- Completeness Score: 50 percent
- SEO Score: 25 percent
- Readability: 25 percent

This keeps the score practical for launch readiness: a tool with many missing required fields cannot rank high even if the text reads well.

### Completeness Score

Completeness Score is the average of field-level quality checks:

- Logo
- Description
- Features
- FAQ
- Screenshots
- SEO
- Pricing
- Alternatives
- Category
- Tags
- Use Cases

### SEO Score

SEO Score checks:

- SEO title exists and is within recommended length.
- SEO description exists and is within recommended length.

Recommended ranges:

- Title: 35-70 characters
- Description: 120-170 characters

### Readability

Readability is estimated from existing text using:

- Word count coverage.
- Average sentence length.

This avoids external AI calls during dashboard loading while still identifying thin or hard-to-read content.

## Quality Breakdown

Each tool receives a breakdown object with metric-level scores:

```json
{
  "logo": { "score": 100, "label": "Logo", "reason": "Logo is available" },
  "description": { "score": 82, "label": "Description", "reason": "Description is detailed enough" },
  "features": { "score": 67, "label": "Features", "reason": "Feature list has 2/3 recommended items" },
  "faq": { "score": 0, "label": "FAQ", "reason": "FAQ has 0/3 recommended items" }
}
```

Metrics below 70 are shown as missing or weak content.

## API

### Get Content Quality Dashboard

`GET /v1/content/quality`

Returns:

- Summary averages
- Top Missing Content
- Quality Ranking
- Best Quality tools
- Metric-level pass/fail counts

### Bulk Improve

`POST /v1/content/quality/bulk-improve`

Request:

```json
{
  "toolIds": ["uuid"]
}
```

If `toolIds` is omitted, the API queues improvement for the top low-quality tools.

Behavior:

- Does not directly overwrite content.
- Reuses the existing AI content pipeline.
- Queues low-quality tools for AI generation and review.
- Keeps editorial approval workflow intact.

## Admin Dashboard

The Admin Content Dashboard now shows:

- Average Content Score
- Average SEO Score
- Average Completeness
- Average Readability
- Excellent tool count
- Needs Work count
- Top Missing Content list
- Quality Ranking list
- Metric-level pass/fail summary
- Bulk Improve action

## Data Governance

The system does not invent facts during scoring. It only evaluates stored fields and relationships.

Bulk Improve does not publish generated content directly. It queues the existing AI pipeline so generated content can still pass through review and approval workflows.

## Field Coverage

| Metric | Source |
| --- | --- |
| Logo | `Tool.logoUrl`, `Tool.metadata.logo`, `Tool.metadata.collectedLogoUrl` |
| Description | `Tool.summary`, `Tool.description`, `Tool.longDescription` |
| Features | `Tool.metadata.features` |
| FAQ | `Faq` relation |
| Screenshots | `ToolScreenshot`, `Tool.metadata.screenshots` |
| SEO | `Tool.metaTitle`, `Tool.metaDescription` |
| Pricing | `Tool.pricingModel`, `PricingPlan` relation |
| Alternatives | `Tool.metadata.alternatives` |
| Category | `ToolCategory` relation |
| Tags | `ToolTag` relation |
| Use Cases | `Tool.metadata.useCases` |

## Acceptance Status

| Requirement | Status | Evidence |
| --- | --- | --- |
| Content Score | PASS | `GET /v1/content/quality` returns `contentScore` per tool. |
| SEO Score | PASS | SEO scoring checks title and description quality. |
| Completeness Score | PASS | Breakdown metrics are averaged into completeness. |
| Readability | PASS | Text readability is computed from summary and description. |
| Quality Breakdown | PASS | Each tool returns metric-level score, label, and reason. |
| Logo metric | PASS | Checks stored and collected logo fields. |
| Description metric | PASS | Checks summary and long/full description. |
| Features metric | PASS | Checks structured metadata features. |
| FAQ metric | PASS | Checks FAQ relation. |
| Screenshots metric | PASS | Checks relational and metadata screenshots. |
| SEO metric | PASS | Checks title and description length. |
| Pricing metric | PASS | Checks pricing model and pricing plans. |
| Alternatives metric | PASS | Checks metadata alternatives. |
| Top Missing Content | PASS | Admin dashboard shows low-quality missing content. |
| Quality Ranking | PASS | Admin dashboard ranks tools by score. |
| Bulk Improve | PASS | Admin action queues existing AI pipeline. |

## Files Changed

- `apps/api/src/content/content.controller.ts`
- `apps/api/src/content/content.service.ts`
- `apps/api/src/content/dto/content-ops.dto.ts`
- `apps/admin/src/app/(dashboard)/content/page.tsx`
- `apps/admin/src/lib/api.ts`
- `docs/14-production/ContentQuality.md`

## Verification

- `pnpm typecheck` passes.
- `pnpm lint` passes with existing non-blocking Blog CMS `<img>` warnings only.

## Future Hardening

1. Persist historical quality snapshots for trend reporting.
2. Add scheduled quality recalculation after imports and AI review approval.
3. Add per-category quality benchmarks.
4. Add exportable CSV quality report.
5. Add editorial assignment workflow for missing content clusters.
6. Add LLM-assisted readability and factuality review as a queued job, not a synchronous dashboard call.
