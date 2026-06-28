-- Sprint 10 — Open Ecosystem (Commits 091–100)

ALTER TYPE "WebhookEvent" ADD VALUE IF NOT EXISTS 'TOOL_DELETED';

CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "PluginStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'DISABLED', 'ERROR');

CREATE TABLE "workflow_definitions" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "steps" JSONB NOT NULL DEFAULT '[]',
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_runs" (
  "id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
  "context" JSONB NOT NULL DEFAULT '{}',
  "current_step" INTEGER NOT NULL DEFAULT 0,
  "result" JSONB NOT NULL DEFAULT '{}',
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plugin_registrations" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "module" VARCHAR(64) NOT NULL,
  "version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  "status" "PluginStatus" NOT NULL DEFAULT 'REGISTERED',
  "config" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "plugin_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feature_flags" (
  "id" UUID NOT NULL,
  "key" VARCHAR(128) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "rollout" INTEGER NOT NULL DEFAULT 100,
  "locales" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "segments" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "variants" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_definitions_slug_key" ON "workflow_definitions"("slug");
CREATE INDEX "workflow_definitions_is_enabled_idx" ON "workflow_definitions"("is_enabled");
CREATE INDEX "workflow_definitions_deleted_at_idx" ON "workflow_definitions"("deleted_at");

CREATE INDEX "workflow_runs_definition_id_idx" ON "workflow_runs"("definition_id");
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");
CREATE INDEX "workflow_runs_created_at_idx" ON "workflow_runs"("created_at");

CREATE UNIQUE INDEX "plugin_registrations_slug_key" ON "plugin_registrations"("slug");
CREATE INDEX "plugin_registrations_module_idx" ON "plugin_registrations"("module");
CREATE INDEX "plugin_registrations_status_idx" ON "plugin_registrations"("status");
CREATE INDEX "plugin_registrations_deleted_at_idx" ON "plugin_registrations"("deleted_at");

CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");
CREATE INDEX "feature_flags_deleted_at_idx" ON "feature_flags"("deleted_at");

ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
