-- Sprint 9 — Autonomous Platform (Commits 081–090)

CREATE TYPE "DiscoverySourceKind" AS ENUM (
  'PRODUCT_HUNT',
  'GITHUB_TRENDING',
  'HUGGING_FACE',
  'REDDIT_AI',
  'HACKER_NEWS',
  'X_AI',
  'GOOGLE_NEWS_AI',
  'RSS_FEED',
  'OFFICIAL_BLOG'
);

CREATE TYPE "DiscoveryTaskStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "DiscoveryResultStatus" AS ENUM (
  'NEW',
  'IMPORTED',
  'DISMISSED',
  'DUPLICATE'
);

CREATE TYPE "AutomationMonitorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

CREATE TYPE "ScreenshotVariant" AS ENUM ('DESKTOP', 'MOBILE', 'DARK');

CREATE TYPE "BrokenLinkIssueType" AS ENUM (
  'HTTP_ERROR',
  'SSL_ERROR',
  'DNS_ERROR',
  'REDIRECT_LOOP',
  'TIMEOUT',
  'OTHER'
);

CREATE TYPE "SocialPlatform" AS ENUM ('X', 'LINKEDIN', 'BLUESKY', 'THREADS', 'MASTODON');

CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');

CREATE TYPE "IndexProvider" AS ENUM ('GOOGLE', 'BING');

CREATE TYPE "IndexSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'FAILED');

CREATE TYPE "AiRefreshContentType" AS ENUM ('SUMMARY', 'FAQ', 'SEO', 'GEO');

CREATE TYPE "AutomationRunKind" AS ENUM (
  'DISCOVERY',
  'WEBSITE_MONITOR',
  'PRICE_MONITOR',
  'SCREENSHOT',
  'LINK_CHECK',
  'AI_REFRESH',
  'SOCIAL_POST',
  'NEWSLETTER',
  'INDEX_SUBMIT'
);

CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "discovery_sources" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "kind" "DiscoverySourceKind" NOT NULL,
  "url" VARCHAR(2048),
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "interval_hours" INTEGER NOT NULL DEFAULT 24,
  "last_run_at" TIMESTAMP(3),
  "next_run_at" TIMESTAMP(3),
  "config" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "discovery_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discovery_tasks" (
  "id" UUID NOT NULL,
  "source_id" UUID NOT NULL,
  "status" "DiscoveryTaskStatus" NOT NULL DEFAULT 'PENDING',
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "items_found" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discovery_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discovery_results" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "source_kind" "DiscoverySourceKind" NOT NULL,
  "external_id" VARCHAR(256),
  "title" VARCHAR(500) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "description" TEXT,
  "relevance_score" DECIMAL(6,3) NOT NULL DEFAULT 0,
  "status" "DiscoveryResultStatus" NOT NULL DEFAULT 'NEW',
  "tool_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discovery_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "website_monitors" (
  "id" UUID NOT NULL,
  "tool_id" UUID NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "status" "AutomationMonitorStatus" NOT NULL DEFAULT 'ACTIVE',
  "content_hash" VARCHAR(128),
  "etag" VARCHAR(256),
  "last_checked_at" TIMESTAMP(3),
  "last_changed_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "website_monitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "website_monitor_events" (
  "id" UUID NOT NULL,
  "monitor_id" UUID NOT NULL,
  "change_type" VARCHAR(64) NOT NULL,
  "before_hash" VARCHAR(128),
  "after_hash" VARCHAR(128),
  "snapshot" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "website_monitor_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_monitors" (
  "id" UUID NOT NULL,
  "tool_id" UUID NOT NULL,
  "pricing_url" VARCHAR(2048) NOT NULL,
  "status" "AutomationMonitorStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_snapshot" JSONB NOT NULL DEFAULT '{}',
  "last_checked_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "price_monitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_change_events" (
  "id" UUID NOT NULL,
  "monitor_id" UUID NOT NULL,
  "before" JSONB NOT NULL DEFAULT '{}',
  "after" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_change_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_screenshots" (
  "id" UUID NOT NULL,
  "tool_id" UUID NOT NULL,
  "variant" "ScreenshotVariant" NOT NULL,
  "target_url" VARCHAR(2048) NOT NULL,
  "storage_key" VARCHAR(512) NOT NULL,
  "width" INTEGER NOT NULL DEFAULT 1280,
  "height" INTEGER NOT NULL DEFAULT 720,
  "captured_at" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_screenshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "broken_link_checks" (
  "id" UUID NOT NULL,
  "target_type" VARCHAR(64) NOT NULL,
  "target_id" UUID NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "http_status" INTEGER,
  "is_healthy" BOOLEAN NOT NULL DEFAULT true,
  "checked_at" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "broken_link_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "broken_link_issues" (
  "id" UUID NOT NULL,
  "check_id" UUID NOT NULL,
  "issue_type" "BrokenLinkIssueType" NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "broken_link_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_refresh_schedules" (
  "id" UUID NOT NULL,
  "tool_id" UUID NOT NULL,
  "content_types" "AiRefreshContentType"[] DEFAULT ARRAY['SUMMARY', 'FAQ', 'SEO', 'GEO']::"AiRefreshContentType"[],
  "interval_days" INTEGER NOT NULL DEFAULT 30,
  "last_refreshed_at" TIMESTAMP(3),
  "next_due_at" TIMESTAMP(3),
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "ai_refresh_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_posts" (
  "id" UUID NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
  "content" TEXT NOT NULL,
  "tool_id" UUID,
  "scheduled_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "external_id" VARCHAR(256),
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "index_submissions" (
  "id" UUID NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "provider" "IndexProvider" NOT NULL,
  "status" "IndexSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "submitted_at" TIMESTAMP(3),
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "index_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_runs" (
  "id" UUID NOT NULL,
  "kind" "AutomationRunKind" NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',
  "reference_id" UUID,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "error_message" TEXT,
  "result" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discovery_sources_slug_key" ON "discovery_sources"("slug");
CREATE INDEX "discovery_sources_kind_idx" ON "discovery_sources"("kind");
CREATE INDEX "discovery_sources_is_enabled_idx" ON "discovery_sources"("is_enabled");
CREATE INDEX "discovery_sources_next_run_at_idx" ON "discovery_sources"("next_run_at");
CREATE INDEX "discovery_sources_deleted_at_idx" ON "discovery_sources"("deleted_at");

CREATE INDEX "discovery_tasks_source_id_idx" ON "discovery_tasks"("source_id");
CREATE INDEX "discovery_tasks_status_idx" ON "discovery_tasks"("status");
CREATE INDEX "discovery_tasks_created_at_idx" ON "discovery_tasks"("created_at");

CREATE INDEX "discovery_results_task_id_idx" ON "discovery_results"("task_id");
CREATE INDEX "discovery_results_source_kind_idx" ON "discovery_results"("source_kind");
CREATE INDEX "discovery_results_status_idx" ON "discovery_results"("status");
CREATE INDEX "discovery_results_external_id_idx" ON "discovery_results"("external_id");
CREATE INDEX "discovery_results_created_at_idx" ON "discovery_results"("created_at");

CREATE UNIQUE INDEX "website_monitors_tool_id_url_key" ON "website_monitors"("tool_id", "url");
CREATE INDEX "website_monitors_tool_id_idx" ON "website_monitors"("tool_id");
CREATE INDEX "website_monitors_status_idx" ON "website_monitors"("status");
CREATE INDEX "website_monitors_last_checked_at_idx" ON "website_monitors"("last_checked_at");
CREATE INDEX "website_monitors_deleted_at_idx" ON "website_monitors"("deleted_at");

CREATE INDEX "website_monitor_events_monitor_id_idx" ON "website_monitor_events"("monitor_id");
CREATE INDEX "website_monitor_events_created_at_idx" ON "website_monitor_events"("created_at");

CREATE UNIQUE INDEX "price_monitors_tool_id_pricing_url_key" ON "price_monitors"("tool_id", "pricing_url");
CREATE INDEX "price_monitors_tool_id_idx" ON "price_monitors"("tool_id");
CREATE INDEX "price_monitors_status_idx" ON "price_monitors"("status");
CREATE INDEX "price_monitors_last_checked_at_idx" ON "price_monitors"("last_checked_at");
CREATE INDEX "price_monitors_deleted_at_idx" ON "price_monitors"("deleted_at");

CREATE INDEX "price_change_events_monitor_id_idx" ON "price_change_events"("monitor_id");
CREATE INDEX "price_change_events_created_at_idx" ON "price_change_events"("created_at");

CREATE UNIQUE INDEX "tool_screenshots_tool_id_variant_key" ON "tool_screenshots"("tool_id", "variant");
CREATE INDEX "tool_screenshots_tool_id_idx" ON "tool_screenshots"("tool_id");
CREATE INDEX "tool_screenshots_variant_idx" ON "tool_screenshots"("variant");
CREATE INDEX "tool_screenshots_captured_at_idx" ON "tool_screenshots"("captured_at");

CREATE INDEX "broken_link_checks_target_type_target_id_idx" ON "broken_link_checks"("target_type", "target_id");
CREATE INDEX "broken_link_checks_url_idx" ON "broken_link_checks"("url");
CREATE INDEX "broken_link_checks_is_healthy_idx" ON "broken_link_checks"("is_healthy");
CREATE INDEX "broken_link_checks_checked_at_idx" ON "broken_link_checks"("checked_at");

CREATE INDEX "broken_link_issues_check_id_idx" ON "broken_link_issues"("check_id");
CREATE INDEX "broken_link_issues_issue_type_idx" ON "broken_link_issues"("issue_type");
CREATE INDEX "broken_link_issues_created_at_idx" ON "broken_link_issues"("created_at");

CREATE UNIQUE INDEX "ai_refresh_schedules_tool_id_key" ON "ai_refresh_schedules"("tool_id");
CREATE INDEX "ai_refresh_schedules_next_due_at_idx" ON "ai_refresh_schedules"("next_due_at");
CREATE INDEX "ai_refresh_schedules_is_enabled_idx" ON "ai_refresh_schedules"("is_enabled");
CREATE INDEX "ai_refresh_schedules_deleted_at_idx" ON "ai_refresh_schedules"("deleted_at");

CREATE INDEX "social_posts_platform_idx" ON "social_posts"("platform");
CREATE INDEX "social_posts_status_idx" ON "social_posts"("status");
CREATE INDEX "social_posts_scheduled_at_idx" ON "social_posts"("scheduled_at");
CREATE INDEX "social_posts_created_at_idx" ON "social_posts"("created_at");

CREATE INDEX "index_submissions_url_idx" ON "index_submissions"("url");
CREATE INDEX "index_submissions_provider_idx" ON "index_submissions"("provider");
CREATE INDEX "index_submissions_status_idx" ON "index_submissions"("status");
CREATE INDEX "index_submissions_created_at_idx" ON "index_submissions"("created_at");

CREATE INDEX "automation_runs_kind_idx" ON "automation_runs"("kind");
CREATE INDEX "automation_runs_status_idx" ON "automation_runs"("status");
CREATE INDEX "automation_runs_reference_id_idx" ON "automation_runs"("reference_id");
CREATE INDEX "automation_runs_created_at_idx" ON "automation_runs"("created_at");

ALTER TABLE "discovery_tasks" ADD CONSTRAINT "discovery_tasks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "discovery_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discovery_results" ADD CONSTRAINT "discovery_results_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "discovery_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "website_monitors" ADD CONSTRAINT "website_monitors_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "website_monitor_events" ADD CONSTRAINT "website_monitor_events_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "website_monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_monitors" ADD CONSTRAINT "price_monitors_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_change_events" ADD CONSTRAINT "price_change_events_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "price_monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_screenshots" ADD CONSTRAINT "tool_screenshots_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "broken_link_issues" ADD CONSTRAINT "broken_link_issues_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "broken_link_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_refresh_schedules" ADD CONSTRAINT "ai_refresh_schedules_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
