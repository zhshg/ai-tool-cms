-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "CrawlRuleType" AS ENUM ('LIST', 'DETAIL', 'CONTENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "CrawlFieldType" AS ENUM ('TEXT', 'HTML', 'URL', 'IMAGE', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY', 'DATE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "CrawlRecordStatus" AS ENUM ('PENDING', 'PARSED', 'CLEANED', 'PUBLISHED', 'FAILED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "crawl_rules" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "rule_type" "CrawlRuleType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "list_config" JSONB NOT NULL DEFAULT '{}',
    "detail_config" JSONB NOT NULL DEFAULT '{}',
    "parse_config" JSONB NOT NULL DEFAULT '{}',
    "request_config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "crawl_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_field_defines" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "field_type" "CrawlFieldType" NOT NULL,
    "source_path" VARCHAR(512),
    "transform" VARCHAR(160),
    "default_value" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_array" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "crawl_field_defines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_records" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "rule_id" UUID,
    "crawl_job_id" UUID,
    "record_key" VARCHAR(160),
    "source_url" VARCHAR(2048) NOT NULL,
    "title" VARCHAR(240),
    "status" "CrawlRecordStatus" NOT NULL DEFAULT 'PENDING',
    "raw_data" JSONB NOT NULL DEFAULT '{}',
    "parsed_data" JSONB NOT NULL DEFAULT '{}',
    "cleaned_data" JSONB NOT NULL DEFAULT '{}',
    "published_tool_id" UUID,
    "error_message" TEXT,
    "fetched_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "crawl_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crawl_rules_source_id_idx" ON "crawl_rules"("source_id");
CREATE INDEX "crawl_rules_rule_type_idx" ON "crawl_rules"("rule_type");
CREATE INDEX "crawl_rules_is_enabled_idx" ON "crawl_rules"("is_enabled");
CREATE INDEX "crawl_rules_priority_idx" ON "crawl_rules"("priority");
CREATE INDEX "crawl_rules_created_by_id_idx" ON "crawl_rules"("created_by_id");
CREATE INDEX "crawl_rules_updated_by_id_idx" ON "crawl_rules"("updated_by_id");
CREATE INDEX "crawl_rules_deleted_by_id_idx" ON "crawl_rules"("deleted_by_id");
CREATE INDEX "crawl_rules_deleted_at_idx" ON "crawl_rules"("deleted_at");
CREATE INDEX "crawl_rules_updated_at_idx" ON "crawl_rules"("updated_at");

CREATE INDEX "crawl_field_defines_source_id_idx" ON "crawl_field_defines"("source_id");
CREATE INDEX "crawl_field_defines_rule_id_idx" ON "crawl_field_defines"("rule_id");
CREATE INDEX "crawl_field_defines_field_key_idx" ON "crawl_field_defines"("field_key");
CREATE INDEX "crawl_field_defines_field_type_idx" ON "crawl_field_defines"("field_type");
CREATE INDEX "crawl_field_defines_created_by_id_idx" ON "crawl_field_defines"("created_by_id");
CREATE INDEX "crawl_field_defines_updated_by_id_idx" ON "crawl_field_defines"("updated_by_id");
CREATE INDEX "crawl_field_defines_deleted_by_id_idx" ON "crawl_field_defines"("deleted_by_id");
CREATE INDEX "crawl_field_defines_deleted_at_idx" ON "crawl_field_defines"("deleted_at");
CREATE INDEX "crawl_field_defines_updated_at_idx" ON "crawl_field_defines"("updated_at");

CREATE INDEX "crawl_records_source_id_idx" ON "crawl_records"("source_id");
CREATE INDEX "crawl_records_rule_id_idx" ON "crawl_records"("rule_id");
CREATE INDEX "crawl_records_crawl_job_id_idx" ON "crawl_records"("crawl_job_id");
CREATE INDEX "crawl_records_record_key_idx" ON "crawl_records"("record_key");
CREATE INDEX "crawl_records_status_idx" ON "crawl_records"("status");
CREATE INDEX "crawl_records_published_tool_id_idx" ON "crawl_records"("published_tool_id");
CREATE INDEX "crawl_records_created_by_id_idx" ON "crawl_records"("created_by_id");
CREATE INDEX "crawl_records_updated_by_id_idx" ON "crawl_records"("updated_by_id");
CREATE INDEX "crawl_records_deleted_by_id_idx" ON "crawl_records"("deleted_by_id");
CREATE INDEX "crawl_records_deleted_at_idx" ON "crawl_records"("deleted_at");
CREATE INDEX "crawl_records_updated_at_idx" ON "crawl_records"("updated_at");

-- AddForeignKey
ALTER TABLE "crawl_rules" ADD CONSTRAINT "crawl_rules_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "crawl_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_field_defines" ADD CONSTRAINT "crawl_field_defines_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "crawl_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_field_defines" ADD CONSTRAINT "crawl_field_defines_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "crawl_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_records" ADD CONSTRAINT "crawl_records_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "crawl_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_records" ADD CONSTRAINT "crawl_records_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "crawl_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crawl_records" ADD CONSTRAINT "crawl_records_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crawl_records" ADD CONSTRAINT "crawl_records_published_tool_id_fkey" FOREIGN KEY ("published_tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
