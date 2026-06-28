-- AI Pipeline v1: longDescription, content revisions, pipeline stages

CREATE TYPE "ContentRevisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "AiPipelineStage" AS ENUM ('SUMMARY', 'FEATURE', 'FAQ', 'SEO', 'GEO', 'QUALITY', 'PUBLISH');

ALTER TABLE "tools" ADD COLUMN "long_description" TEXT;

CREATE TABLE "content_revisions" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "stage" "AiPipelineStage" NOT NULL,
    "status" "ContentRevisionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "quality_score" INTEGER,
    "review_note" TEXT,
    "ai_task_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_revisions_tool_id_idx" ON "content_revisions"("tool_id");
CREATE INDEX "content_revisions_stage_idx" ON "content_revisions"("stage");
CREATE INDEX "content_revisions_status_idx" ON "content_revisions"("status");
CREATE INDEX "content_revisions_quality_score_idx" ON "content_revisions"("quality_score");
CREATE INDEX "content_revisions_ai_task_id_idx" ON "content_revisions"("ai_task_id");
CREATE INDEX "content_revisions_created_at_idx" ON "content_revisions"("created_at");
CREATE INDEX "content_revisions_deleted_at_idx" ON "content_revisions"("deleted_at");

ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_ai_task_id_fkey" FOREIGN KEY ("ai_task_id") REFERENCES "ai_generation_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
