# Product Sprint 4.4 - AI Review Workflow

## Summary

Implemented a production-oriented AI Review workflow for the AI Tool CMS. The workflow now supports Imported -> AI Generated -> Pending Review -> Approved -> Published -> Archived using existing `ToolStatus`, `ContentRevision`, `AiGenerationTask`, and `AuditLog` models.

## Workflow

1. Imported tools enter the CMS as draft/imported content.
2. AI generation creates `AiGenerationTask` records and `ContentRevision` payloads.
3. Generated content appears in the Pending Review queue.
4. Editors can compare, edit, approve, or reject generated payloads.
5. Approved revisions apply the generated content to the tool, FAQ, SEO metadata, or metadata.
6. Approved tools can be published.
7. Tools can be archived from the review workflow.
8. History and audit logs are available for review traceability.

## Admin Capabilities

Updated `/admin/ai-review` with:

- Review Queue by status
- Compare Changes
- Edit generated payload before approval
- Approve
- Reject
- Publish
- Archive
- Bulk Approve
- Bulk Reject
- Bulk Generate
- History panel
- Audit Log panel

## API Capabilities

Existing endpoints retained:

- `GET /v1/ai/revisions`
- `GET /v1/ai/revisions/:id`
- `POST /v1/ai/revisions/:id/approve`
- `POST /v1/ai/revisions/:id/reject`
- `POST /v1/ai/tools/:toolId/regenerate`
- `POST /v1/ai/tools/bulk-generate`

New endpoints:

- `GET /v1/ai/revisions/:id/compare`
- `POST /v1/ai/revisions/:id/edit`
- `POST /v1/ai/revisions/bulk-approve`
- `POST /v1/ai/revisions/bulk-reject`
- `POST /v1/ai/tools/:toolId/publish`
- `POST /v1/ai/tools/:toolId/archive`
- `GET /v1/ai/tools/:toolId/history`

## Compare Changes

Compare returns:

- Current Tool content
- Current metadata
- Current FAQ
- Current SEO metadata
- Proposed revision payload

This gives editors enough context to verify generated content before approval.

## Edit Flow

Editors can edit the JSON payload of a pending `ContentRevision` before approval. The edited payload remains pending until approved and is recorded with metadata and audit log entries.

## Bulk Review

Bulk review applies to selected pending revisions:

- Bulk Approve applies each selected revision through the normal approval path.
- Bulk Reject rejects each selected revision through the normal rejection path.

## Publish and Archive

Publishing sets `Tool.status = PUBLISHED` and `publishedAt`.

Archiving sets `Tool.status = ARCHIVED`.

Both actions create audit log entries.

## Audit Log

Audit records are written for:

- Revision edit
- Revision approval
- Revision rejection
- Tool publish
- Tool archive

The history endpoint returns both content revisions and audit logs for a tool.

## Notes

No Prisma migration was added. The workflow reuses existing schema primitives.

## Verification

Passed:

- `pnpm --filter @ai-tool-cms/api lint`
- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/admin typecheck`

## Remaining Work

- Add a human-friendly visual field-level diff instead of JSON compare only.
- Add per-field approval controls.
- Add a dedicated Imported queue sourced from recently imported draft tools.
- Add reviewer assignment and SLA timers.
- Add audit log filtering and pagination in Admin.
