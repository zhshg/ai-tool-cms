-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FREE', 'FREEMIUM', 'PAID', 'CONTACT');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CrawlJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiGenerationTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewVoteValue" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "SeoEntityType" AS ENUM ('TOOL', 'CATEGORY', 'TAG', 'PROMPT', 'COLLECTION', 'PAGE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ARCHIVE', 'LOGIN', 'LOGOUT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "slug" VARCHAR(120),
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(120),
    "avatar_url" VARCHAR(2048),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(64) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "key_prefix" VARCHAR(16) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "icon_url" VARCHAR(2048),
    "meta_title" VARCHAR(160),
    "meta_description" VARCHAR(320),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "summary" VARCHAR(500),
    "website" VARCHAR(2048) NOT NULL,
    "logo_url" VARCHAR(2048),
    "pricing_model" "PricingModel" NOT NULL DEFAULT 'FREE',
    "status" "ToolStatus" NOT NULL DEFAULT 'DRAFT',
    "meta_title" VARCHAR(160),
    "meta_description" VARCHAR(320),
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_categories" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tool_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_tags" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tool_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "pricing_model" "PricingModel" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(12,2),
    "billing_period" "BillingPeriod",
    "description" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_versions" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ToolStatus" NOT NULL,
    "changelog" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tool_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "user_id" UUID,
    "slug" VARCHAR(120) NOT NULL,
    "author_name" VARCHAR(120),
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "value" "ReviewVoteValue" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prompt_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "tool_id" UUID,
    "prompt_category_id" UUID,
    "model_hint" VARCHAR(120),
    "variables" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "user_id" UUID NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_metadata" (
    "id" UUID NOT NULL,
    "entity_type" "SeoEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "tool_id" UUID,
    "meta_title" VARCHAR(160),
    "meta_description" VARCHAR(320),
    "canonical_url" VARCHAR(2048),
    "og_image_url" VARCHAR(2048),
    "robots" VARCHAR(120),
    "schema_json" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "seo_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_sources" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "base_url" VARCHAR(2048) NOT NULL,
    "adapter_type" VARCHAR(64) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "crawl_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_jobs" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "status" "CrawlJobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "items_created" INTEGER NOT NULL DEFAULT 0,
    "items_updated" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "result" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation_tasks" (
    "id" UUID NOT NULL,
    "task_type" VARCHAR(64) NOT NULL,
    "status" "AiGenerationTaskStatus" NOT NULL DEFAULT 'PENDING',
    "tool_id" UUID,
    "user_id" UUID,
    "model" VARCHAR(120),
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_generation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID,
    "entity_slug" VARCHAR(120),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "value" JSONB NOT NULL,
    "group" VARCHAR(64) NOT NULL DEFAULT 'general',
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_slug_idx" ON "users"("slug");

-- CreateIndex
CREATE INDEX "users_created_by_id_idx" ON "users"("created_by_id");

-- CreateIndex
CREATE INDEX "users_updated_by_id_idx" ON "users"("updated_by_id");

-- CreateIndex
CREATE INDEX "users_deleted_by_id_idx" ON "users"("deleted_by_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "roles_slug_idx" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "roles_created_by_id_idx" ON "roles"("created_by_id");

-- CreateIndex
CREATE INDEX "roles_updated_by_id_idx" ON "roles"("updated_by_id");

-- CreateIndex
CREATE INDEX "roles_deleted_by_id_idx" ON "roles"("deleted_by_id");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE INDEX "roles_updated_at_idx" ON "roles"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_slug_idx" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "permissions_created_by_id_idx" ON "permissions"("created_by_id");

-- CreateIndex
CREATE INDEX "permissions_updated_by_id_idx" ON "permissions"("updated_by_id");

-- CreateIndex
CREATE INDEX "permissions_deleted_by_id_idx" ON "permissions"("deleted_by_id");

-- CreateIndex
CREATE INDEX "permissions_deleted_at_idx" ON "permissions"("deleted_at");

-- CreateIndex
CREATE INDEX "permissions_updated_at_idx" ON "permissions"("updated_at");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_deleted_at_idx" ON "user_roles"("deleted_at");

-- CreateIndex
CREATE INDEX "user_roles_updated_at_idx" ON "user_roles"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "role_permissions_deleted_at_idx" ON "role_permissions"("deleted_at");

-- CreateIndex
CREATE INDEX "role_permissions_updated_at_idx" ON "role_permissions"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");

-- CreateIndex
CREATE INDEX "api_keys_deleted_at_idx" ON "api_keys"("deleted_at");

-- CreateIndex
CREATE INDEX "api_keys_updated_at_idx" ON "api_keys"("updated_at");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_sort_order_idx" ON "categories"("sort_order");

-- CreateIndex
CREATE INDEX "categories_created_by_id_idx" ON "categories"("created_by_id");

-- CreateIndex
CREATE INDEX "categories_updated_by_id_idx" ON "categories"("updated_by_id");

-- CreateIndex
CREATE INDEX "categories_deleted_by_id_idx" ON "categories"("deleted_by_id");

-- CreateIndex
CREATE INDEX "categories_deleted_at_idx" ON "categories"("deleted_at");

-- CreateIndex
CREATE INDEX "categories_updated_at_idx" ON "categories"("updated_at");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_created_by_id_idx" ON "tags"("created_by_id");

-- CreateIndex
CREATE INDEX "tags_updated_by_id_idx" ON "tags"("updated_by_id");

-- CreateIndex
CREATE INDEX "tags_deleted_by_id_idx" ON "tags"("deleted_by_id");

-- CreateIndex
CREATE INDEX "tags_deleted_at_idx" ON "tags"("deleted_at");

-- CreateIndex
CREATE INDEX "tags_updated_at_idx" ON "tags"("updated_at");

-- CreateIndex
CREATE INDEX "tools_slug_idx" ON "tools"("slug");

-- CreateIndex
CREATE INDEX "tools_status_idx" ON "tools"("status");

-- CreateIndex
CREATE INDEX "tools_pricing_model_idx" ON "tools"("pricing_model");

-- CreateIndex
CREATE INDEX "tools_published_at_idx" ON "tools"("published_at");

-- CreateIndex
CREATE INDEX "tools_website_idx" ON "tools"("website");

-- CreateIndex
CREATE INDEX "tools_created_by_id_idx" ON "tools"("created_by_id");

-- CreateIndex
CREATE INDEX "tools_updated_by_id_idx" ON "tools"("updated_by_id");

-- CreateIndex
CREATE INDEX "tools_deleted_by_id_idx" ON "tools"("deleted_by_id");

-- CreateIndex
CREATE INDEX "tools_deleted_at_idx" ON "tools"("deleted_at");

-- CreateIndex
CREATE INDEX "tools_created_at_idx" ON "tools"("created_at");

-- CreateIndex
CREATE INDEX "tools_updated_at_idx" ON "tools"("updated_at");

-- CreateIndex
CREATE INDEX "tool_categories_tool_id_idx" ON "tool_categories"("tool_id");

-- CreateIndex
CREATE INDEX "tool_categories_category_id_idx" ON "tool_categories"("category_id");

-- CreateIndex
CREATE INDEX "tool_categories_deleted_at_idx" ON "tool_categories"("deleted_at");

-- CreateIndex
CREATE INDEX "tool_categories_updated_at_idx" ON "tool_categories"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_categories_tool_id_category_id_key" ON "tool_categories"("tool_id", "category_id");

-- CreateIndex
CREATE INDEX "tool_tags_tool_id_idx" ON "tool_tags"("tool_id");

-- CreateIndex
CREATE INDEX "tool_tags_tag_id_idx" ON "tool_tags"("tag_id");

-- CreateIndex
CREATE INDEX "tool_tags_deleted_at_idx" ON "tool_tags"("deleted_at");

-- CreateIndex
CREATE INDEX "tool_tags_updated_at_idx" ON "tool_tags"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_tags_tool_id_tag_id_key" ON "tool_tags"("tool_id", "tag_id");

-- CreateIndex
CREATE INDEX "pricing_plans_tool_id_slug_idx" ON "pricing_plans"("tool_id", "slug");

-- CreateIndex
CREATE INDEX "pricing_plans_tool_id_idx" ON "pricing_plans"("tool_id");

-- CreateIndex
CREATE INDEX "pricing_plans_pricing_model_idx" ON "pricing_plans"("pricing_model");

-- CreateIndex
CREATE INDEX "pricing_plans_created_by_id_idx" ON "pricing_plans"("created_by_id");

-- CreateIndex
CREATE INDEX "pricing_plans_updated_by_id_idx" ON "pricing_plans"("updated_by_id");

-- CreateIndex
CREATE INDEX "pricing_plans_deleted_by_id_idx" ON "pricing_plans"("deleted_by_id");

-- CreateIndex
CREATE INDEX "pricing_plans_deleted_at_idx" ON "pricing_plans"("deleted_at");

-- CreateIndex
CREATE INDEX "pricing_plans_updated_at_idx" ON "pricing_plans"("updated_at");

-- CreateIndex
CREATE INDEX "tool_versions_tool_id_slug_idx" ON "tool_versions"("tool_id", "slug");

-- CreateIndex
CREATE INDEX "tool_versions_tool_id_idx" ON "tool_versions"("tool_id");

-- CreateIndex
CREATE INDEX "tool_versions_status_idx" ON "tool_versions"("status");

-- CreateIndex
CREATE INDEX "tool_versions_created_by_id_idx" ON "tool_versions"("created_by_id");

-- CreateIndex
CREATE INDEX "tool_versions_updated_by_id_idx" ON "tool_versions"("updated_by_id");

-- CreateIndex
CREATE INDEX "tool_versions_deleted_by_id_idx" ON "tool_versions"("deleted_by_id");

-- CreateIndex
CREATE INDEX "tool_versions_deleted_at_idx" ON "tool_versions"("deleted_at");

-- CreateIndex
CREATE INDEX "tool_versions_updated_at_idx" ON "tool_versions"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_versions_tool_id_version_number_key" ON "tool_versions"("tool_id", "version_number");

-- CreateIndex
CREATE INDEX "reviews_tool_id_slug_idx" ON "reviews"("tool_id", "slug");

-- CreateIndex
CREATE INDEX "reviews_tool_id_idx" ON "reviews"("tool_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_created_by_id_idx" ON "reviews"("created_by_id");

-- CreateIndex
CREATE INDEX "reviews_updated_by_id_idx" ON "reviews"("updated_by_id");

-- CreateIndex
CREATE INDEX "reviews_deleted_by_id_idx" ON "reviews"("deleted_by_id");

-- CreateIndex
CREATE INDEX "reviews_deleted_at_idx" ON "reviews"("deleted_at");

-- CreateIndex
CREATE INDEX "reviews_updated_at_idx" ON "reviews"("updated_at");

-- CreateIndex
CREATE INDEX "review_votes_review_id_idx" ON "review_votes"("review_id");

-- CreateIndex
CREATE INDEX "review_votes_user_id_idx" ON "review_votes"("user_id");

-- CreateIndex
CREATE INDEX "review_votes_deleted_at_idx" ON "review_votes"("deleted_at");

-- CreateIndex
CREATE INDEX "review_votes_updated_at_idx" ON "review_votes"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_review_id_user_id_key" ON "review_votes"("review_id", "user_id");

-- CreateIndex
CREATE INDEX "faqs_tool_id_slug_idx" ON "faqs"("tool_id", "slug");

-- CreateIndex
CREATE INDEX "faqs_tool_id_idx" ON "faqs"("tool_id");

-- CreateIndex
CREATE INDEX "faqs_sort_order_idx" ON "faqs"("sort_order");

-- CreateIndex
CREATE INDEX "faqs_created_by_id_idx" ON "faqs"("created_by_id");

-- CreateIndex
CREATE INDEX "faqs_updated_by_id_idx" ON "faqs"("updated_by_id");

-- CreateIndex
CREATE INDEX "faqs_deleted_by_id_idx" ON "faqs"("deleted_by_id");

-- CreateIndex
CREATE INDEX "faqs_deleted_at_idx" ON "faqs"("deleted_at");

-- CreateIndex
CREATE INDEX "faqs_updated_at_idx" ON "faqs"("updated_at");

-- CreateIndex
CREATE INDEX "prompt_categories_slug_idx" ON "prompt_categories"("slug");

-- CreateIndex
CREATE INDEX "prompt_categories_parent_id_idx" ON "prompt_categories"("parent_id");

-- CreateIndex
CREATE INDEX "prompt_categories_created_by_id_idx" ON "prompt_categories"("created_by_id");

-- CreateIndex
CREATE INDEX "prompt_categories_updated_by_id_idx" ON "prompt_categories"("updated_by_id");

-- CreateIndex
CREATE INDEX "prompt_categories_deleted_by_id_idx" ON "prompt_categories"("deleted_by_id");

-- CreateIndex
CREATE INDEX "prompt_categories_deleted_at_idx" ON "prompt_categories"("deleted_at");

-- CreateIndex
CREATE INDEX "prompt_categories_updated_at_idx" ON "prompt_categories"("updated_at");

-- CreateIndex
CREATE INDEX "prompts_slug_idx" ON "prompts"("slug");

-- CreateIndex
CREATE INDEX "prompts_tool_id_idx" ON "prompts"("tool_id");

-- CreateIndex
CREATE INDEX "prompts_prompt_category_id_idx" ON "prompts"("prompt_category_id");

-- CreateIndex
CREATE INDEX "prompts_status_idx" ON "prompts"("status");

-- CreateIndex
CREATE INDEX "prompts_created_by_id_idx" ON "prompts"("created_by_id");

-- CreateIndex
CREATE INDEX "prompts_updated_by_id_idx" ON "prompts"("updated_by_id");

-- CreateIndex
CREATE INDEX "prompts_deleted_by_id_idx" ON "prompts"("deleted_by_id");

-- CreateIndex
CREATE INDEX "prompts_deleted_at_idx" ON "prompts"("deleted_at");

-- CreateIndex
CREATE INDEX "prompts_updated_at_idx" ON "prompts"("updated_at");

-- CreateIndex
CREATE INDEX "collections_slug_idx" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_user_id_idx" ON "collections"("user_id");

-- CreateIndex
CREATE INDEX "collections_is_public_idx" ON "collections"("is_public");

-- CreateIndex
CREATE INDEX "collections_created_by_id_idx" ON "collections"("created_by_id");

-- CreateIndex
CREATE INDEX "collections_updated_by_id_idx" ON "collections"("updated_by_id");

-- CreateIndex
CREATE INDEX "collections_deleted_by_id_idx" ON "collections"("deleted_by_id");

-- CreateIndex
CREATE INDEX "collections_deleted_at_idx" ON "collections"("deleted_at");

-- CreateIndex
CREATE INDEX "collections_updated_at_idx" ON "collections"("updated_at");

-- CreateIndex
CREATE INDEX "collection_items_collection_id_idx" ON "collection_items"("collection_id");

-- CreateIndex
CREATE INDEX "collection_items_tool_id_idx" ON "collection_items"("tool_id");

-- CreateIndex
CREATE INDEX "collection_items_deleted_at_idx" ON "collection_items"("deleted_at");

-- CreateIndex
CREATE INDEX "collection_items_updated_at_idx" ON "collection_items"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collection_id_tool_id_key" ON "collection_items"("collection_id", "tool_id");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_tool_id_idx" ON "favorites"("tool_id");

-- CreateIndex
CREATE INDEX "favorites_deleted_at_idx" ON "favorites"("deleted_at");

-- CreateIndex
CREATE INDEX "favorites_updated_at_idx" ON "favorites"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_tool_id_key" ON "favorites"("user_id", "tool_id");

-- CreateIndex
CREATE INDEX "seo_metadata_tool_id_idx" ON "seo_metadata"("tool_id");

-- CreateIndex
CREATE INDEX "seo_metadata_entity_type_idx" ON "seo_metadata"("entity_type");

-- CreateIndex
CREATE INDEX "seo_metadata_created_by_id_idx" ON "seo_metadata"("created_by_id");

-- CreateIndex
CREATE INDEX "seo_metadata_updated_by_id_idx" ON "seo_metadata"("updated_by_id");

-- CreateIndex
CREATE INDEX "seo_metadata_deleted_by_id_idx" ON "seo_metadata"("deleted_by_id");

-- CreateIndex
CREATE INDEX "seo_metadata_deleted_at_idx" ON "seo_metadata"("deleted_at");

-- CreateIndex
CREATE INDEX "seo_metadata_updated_at_idx" ON "seo_metadata"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "seo_metadata_entity_type_entity_id_key" ON "seo_metadata"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "crawl_sources_slug_idx" ON "crawl_sources"("slug");

-- CreateIndex
CREATE INDEX "crawl_sources_is_enabled_idx" ON "crawl_sources"("is_enabled");

-- CreateIndex
CREATE INDEX "crawl_sources_created_by_id_idx" ON "crawl_sources"("created_by_id");

-- CreateIndex
CREATE INDEX "crawl_sources_updated_by_id_idx" ON "crawl_sources"("updated_by_id");

-- CreateIndex
CREATE INDEX "crawl_sources_deleted_by_id_idx" ON "crawl_sources"("deleted_by_id");

-- CreateIndex
CREATE INDEX "crawl_sources_deleted_at_idx" ON "crawl_sources"("deleted_at");

-- CreateIndex
CREATE INDEX "crawl_sources_updated_at_idx" ON "crawl_sources"("updated_at");

-- CreateIndex
CREATE INDEX "crawl_jobs_source_id_idx" ON "crawl_jobs"("source_id");

-- CreateIndex
CREATE INDEX "crawl_jobs_status_idx" ON "crawl_jobs"("status");

-- CreateIndex
CREATE INDEX "crawl_jobs_created_by_id_idx" ON "crawl_jobs"("created_by_id");

-- CreateIndex
CREATE INDEX "crawl_jobs_updated_by_id_idx" ON "crawl_jobs"("updated_by_id");

-- CreateIndex
CREATE INDEX "crawl_jobs_deleted_by_id_idx" ON "crawl_jobs"("deleted_by_id");

-- CreateIndex
CREATE INDEX "crawl_jobs_created_at_idx" ON "crawl_jobs"("created_at");

-- CreateIndex
CREATE INDEX "crawl_jobs_deleted_at_idx" ON "crawl_jobs"("deleted_at");

-- CreateIndex
CREATE INDEX "crawl_jobs_updated_at_idx" ON "crawl_jobs"("updated_at");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_tool_id_idx" ON "ai_generation_tasks"("tool_id");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_user_id_idx" ON "ai_generation_tasks"("user_id");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_status_idx" ON "ai_generation_tasks"("status");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_task_type_idx" ON "ai_generation_tasks"("task_type");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_created_by_id_idx" ON "ai_generation_tasks"("created_by_id");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_updated_by_id_idx" ON "ai_generation_tasks"("updated_by_id");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_deleted_by_id_idx" ON "ai_generation_tasks"("deleted_by_id");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_deleted_at_idx" ON "ai_generation_tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "ai_generation_tasks_updated_at_idx" ON "ai_generation_tasks"("updated_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_slug_idx" ON "audit_logs"("entity_slug");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_deleted_at_idx" ON "audit_logs"("deleted_at");

-- CreateIndex
CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_group_idx" ON "settings"("group");

-- CreateIndex
CREATE INDEX "settings_is_public_idx" ON "settings"("is_public");

-- CreateIndex
CREATE INDEX "settings_created_by_id_idx" ON "settings"("created_by_id");

-- CreateIndex
CREATE INDEX "settings_updated_by_id_idx" ON "settings"("updated_by_id");

-- CreateIndex
CREATE INDEX "settings_deleted_by_id_idx" ON "settings"("deleted_by_id");

-- CreateIndex
CREATE INDEX "settings_deleted_at_idx" ON "settings"("deleted_at");

-- CreateIndex
CREATE INDEX "settings_updated_at_idx" ON "settings"("updated_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_categories" ADD CONSTRAINT "tool_categories_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_categories" ADD CONSTRAINT "tool_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_tags" ADD CONSTRAINT "tool_tags_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_tags" ADD CONSTRAINT "tool_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_versions" ADD CONSTRAINT "tool_versions_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_categories" ADD CONSTRAINT "prompt_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "prompt_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_prompt_category_id_fkey" FOREIGN KEY ("prompt_category_id") REFERENCES "prompt_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "crawl_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_tasks" ADD CONSTRAINT "ai_generation_tasks_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_tasks" ADD CONSTRAINT "ai_generation_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Partial unique indexes: active slug uniqueness (soft-delete safe)
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX "users_slug_active_key" ON "users"("slug") WHERE "deleted_at" IS NULL AND "slug" IS NOT NULL;
CREATE UNIQUE INDEX "roles_slug_active_key" ON "roles"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "permissions_slug_active_key" ON "permissions"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "categories_slug_active_key" ON "categories"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "tags_slug_active_key" ON "tags"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "tools_slug_active_key" ON "tools"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "prompt_categories_slug_active_key" ON "prompt_categories"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "prompts_slug_active_key" ON "prompts"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "collections_slug_active_key" ON "collections"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "crawl_sources_slug_active_key" ON "crawl_sources"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "pricing_plans_tool_slug_active_key" ON "pricing_plans"("tool_id", "slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "tool_versions_tool_slug_active_key" ON "tool_versions"("tool_id", "slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "reviews_tool_slug_active_key" ON "reviews"("tool_id", "slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "faqs_tool_slug_active_key" ON "faqs"("tool_id", "slug") WHERE "deleted_at" IS NULL;
