-- Sprint 8: Global Platform i18n (Commits 071-080)

CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'AI_GENERATED', 'HUMAN_REVIEWED', 'PUBLISHED');
CREATE TYPE "TranslationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "TranslationJobStage" AS ENUM ('ENGLISH', 'AI_GENERATE', 'SEO', 'REVIEW', 'PUBLISH');

CREATE TABLE "tool_translations" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "region" VARCHAR(16),
    "summary" VARCHAR(500),
    "long_description" TEXT,
    "meta_title" VARCHAR(160),
    "meta_description" VARCHAR(320),
    "faq_json" JSONB NOT NULL DEFAULT '[]',
    "compare_json" JSONB NOT NULL DEFAULT '[]',
    "alternatives_json" JSONB NOT NULL DEFAULT '[]',
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "tool_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "category_translations" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "meta_title" VARCHAR(160),
    "meta_description" VARCHAR(320),
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_jobs" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "target_locale" VARCHAR(16) NOT NULL,
    "source_locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "status" "TranslationJobStatus" NOT NULL DEFAULT 'PENDING',
    "stage" "TranslationJobStage" NOT NULL DEFAULT 'ENGLISH',
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    CONSTRAINT "translation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regional_seo_configs" (
    "id" UUID NOT NULL,
    "region" VARCHAR(16) NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meta_title" VARCHAR(160),
    "meta_description" VARCHAR(320),
    "ai_summary" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "regional_seo_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "country_analytics_snapshots" (
    "id" UUID NOT NULL,
    "country" VARCHAR(8) NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "period" VARCHAR(16) NOT NULL,
    "period_key" VARCHAR(32) NOT NULL,
    "traffic" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "top_category" VARCHAR(120),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "country_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tool_translations_tool_id_idx" ON "tool_translations"("tool_id");
CREATE INDEX "tool_translations_locale_idx" ON "tool_translations"("locale");
CREATE INDEX "tool_translations_region_idx" ON "tool_translations"("region");
CREATE INDEX "tool_translations_status_idx" ON "tool_translations"("status");
CREATE INDEX "tool_translations_deleted_at_idx" ON "tool_translations"("deleted_at");
CREATE INDEX "tool_translations_updated_at_idx" ON "tool_translations"("updated_at");

CREATE INDEX "category_translations_category_id_idx" ON "category_translations"("category_id");
CREATE INDEX "category_translations_locale_idx" ON "category_translations"("locale");
CREATE INDEX "category_translations_status_idx" ON "category_translations"("status");
CREATE INDEX "category_translations_deleted_at_idx" ON "category_translations"("deleted_at");

CREATE INDEX "translation_jobs_tool_id_idx" ON "translation_jobs"("tool_id");
CREATE INDEX "translation_jobs_target_locale_idx" ON "translation_jobs"("target_locale");
CREATE INDEX "translation_jobs_status_idx" ON "translation_jobs"("status");
CREATE INDEX "translation_jobs_stage_idx" ON "translation_jobs"("stage");
CREATE INDEX "translation_jobs_created_at_idx" ON "translation_jobs"("created_at");

CREATE UNIQUE INDEX "regional_seo_configs_region_locale_key" ON "regional_seo_configs"("region", "locale");
CREATE INDEX "regional_seo_configs_region_idx" ON "regional_seo_configs"("region");
CREATE INDEX "regional_seo_configs_locale_idx" ON "regional_seo_configs"("locale");
CREATE INDEX "regional_seo_configs_deleted_at_idx" ON "regional_seo_configs"("deleted_at");

CREATE UNIQUE INDEX "country_analytics_snapshots_country_locale_period_key_key" ON "country_analytics_snapshots"("country", "locale", "period_key");
CREATE INDEX "country_analytics_snapshots_country_idx" ON "country_analytics_snapshots"("country");
CREATE INDEX "country_analytics_snapshots_locale_idx" ON "country_analytics_snapshots"("locale");
CREATE INDEX "country_analytics_snapshots_period_key_idx" ON "country_analytics_snapshots"("period_key");
CREATE INDEX "country_analytics_snapshots_created_at_idx" ON "country_analytics_snapshots"("created_at");

CREATE UNIQUE INDEX "tool_translations_tool_locale_active_key" ON "tool_translations"("tool_id", "locale") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "category_translations_category_locale_active_key" ON "category_translations"("category_id", "locale") WHERE "deleted_at" IS NULL;

ALTER TABLE "tool_translations" ADD CONSTRAINT "tool_translations_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
