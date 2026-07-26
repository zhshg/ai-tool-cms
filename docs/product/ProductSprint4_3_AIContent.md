# Product Sprint 4.3 - AI Content Generation

## Summary

Implemented the AI content generation workflow on top of the existing AI pipeline, queue, `AiGenerationTask`, and `ContentRevision` review gate. The implementation supports single-tool generation, bulk generation, queued background processing, retry through existing queue defaults, content preview, approve, and reject.

## Generated Content Fields

The AI pipeline now produces and preserves:

- Summary
- Features
- Pros
- Cons
- Use Cases
- FAQ
- SEO Title
- SEO Description
- OG Description
- Keywords
- Support

## Data Flow

1. Admin triggers single or bulk generation.
2. API queues the AI pipeline with `enqueueAiJob`.
3. Worker processes stages: Summary, Feature, FAQ, SEO, GEO, Quality, Publish gate.
4. Each stage writes an `AiGenerationTask` and a `ContentRevision`.
5. Admin previews the revision payload.
6. Editor approves or rejects the revision.
7. Approved payload is applied to the Tool, FAQ, SEO metadata, or Tool metadata.

## API

Existing endpoints:

- `GET /v1/ai/revisions`
- `GET /v1/ai/revisions/:id`
- `POST /v1/ai/revisions/:id/approve`
- `POST /v1/ai/revisions/:id/reject`
- `POST /v1/ai/tools/:toolId/regenerate`

New endpoint:

- `POST /v1/ai/tools/bulk-generate`

## Admin

Updated `/admin/ai-review`:

- Shows revision list by status.
- Adds content preview panel for generated payload JSON.
- Keeps approve and reject flow.
- Keeps single regenerate per revision/tool.
- Adds bulk generation for tools currently visible in the review list.

## Storage

No Prisma migration was added.

Generated data is stored in existing fields:

- `Tool.summary`
- `Tool.longDescription`
- `Tool.metadata.aiFeatures`
- `Tool.metadata.aiPros`
- `Tool.metadata.aiCons`
- `Tool.metadata.aiUseCases`
- `Tool.metadata.aiSupport`
- `Tool.metadata.aiTargetUsers`
- `Tool.metadata.aiPlatforms`
- `Tool.metadata.aiLanguages`
- `Faq`
- `SeoMetadata.schemaJson.keywords`
- `SeoMetadata.schemaJson.ogDescription`

## Queue and Retry

The pipeline reuses the existing AI queues:

- `ai-summary`
- `ai-feature`
- `ai-faq`
- `ai-seo`
- `ai-geo`
- `ai-quality`
- `ai-publish`

Retry behavior is inherited from the queue defaults and quality retry loop.

## Verification

Passed:

- `pnpm --filter @ai-tool-cms/ai lint`
- `pnpm --filter @ai-tool-cms/ai typecheck`
- `pnpm --filter @ai-tool-cms/ai build`
- `pnpm --filter @ai-tool-cms/api lint`
- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/admin typecheck`
- `pnpm --filter @ai-tool-cms/worker lint`
- `pnpm --filter @ai-tool-cms/worker typecheck`

## Remaining Work

- Add a dedicated bulk generation selector/filter UI beyond the current visible review list.
- Add human-friendly diff view between current content and generated content.
- Add provider/model selector per generation request.
- Add field-level approval instead of approving a whole stage payload.
- Add production prompt tuning for stricter originality, factuality, and brand-safe wording.
