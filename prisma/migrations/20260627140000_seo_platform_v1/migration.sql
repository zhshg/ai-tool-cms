-- SEO Platform v1: compare pages, internal links, health snapshots

CREATE TYPE "SeoComparePageType" AS ENUM ('TOOL_VS', 'ALTERNATIVES', 'TOP_LIST');

CREATE TYPE "InternalLinkType" AS ENUM ('ALTERNATIVE', 'COMPARE', 'CATEGORY', 'TAG', 'PROMPT', 'FAQ', 'RELATED', 'TRENDING');

CREATE TABLE "seo_compare_pages" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "type" "SeoComparePageType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "tool_id" UUID,
    "tool_b_id" UUID,
    "category_id" UUID,
    "tag_id" UUID,
    "status" "ToolStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "seo_compare_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_compare_pages_slug_key" ON "seo_compare_pages"("slug");
CREATE INDEX "seo_compare_pages_type_idx" ON "seo_compare_pages"("type");
CREATE INDEX "seo_compare_pages_status_idx" ON "seo_compare_pages"("status");
CREATE INDEX "seo_compare_pages_tool_id_idx" ON "seo_compare_pages"("tool_id");
CREATE INDEX "seo_compare_pages_category_id_idx" ON "seo_compare_pages"("category_id");
CREATE INDEX "seo_compare_pages_deleted_at_idx" ON "seo_compare_pages"("deleted_at");

CREATE TABLE "internal_links" (
    "id" UUID NOT NULL,
    "source_tool_id" UUID NOT NULL,
    "target_slug" VARCHAR(160) NOT NULL,
    "target_kind" VARCHAR(32) NOT NULL,
    "link_type" "InternalLinkType" NOT NULL,
    "anchor_text" VARCHAR(200) NOT NULL,
    "href" VARCHAR(2048) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "internal_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "internal_links_source_tool_id_idx" ON "internal_links"("source_tool_id");
CREATE INDEX "internal_links_link_type_idx" ON "internal_links"("link_type");
CREATE INDEX "internal_links_target_slug_idx" ON "internal_links"("target_slug");
CREATE INDEX "internal_links_deleted_at_idx" ON "internal_links"("deleted_at");

CREATE TABLE "seo_health_snapshots" (
    "id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_health_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seo_health_snapshots_created_at_idx" ON "seo_health_snapshots"("created_at");

ALTER TABLE "seo_compare_pages" ADD CONSTRAINT "seo_compare_pages_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_compare_pages" ADD CONSTRAINT "seo_compare_pages_tool_b_id_fkey" FOREIGN KEY ("tool_b_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_compare_pages" ADD CONSTRAINT "seo_compare_pages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seo_compare_pages" ADD CONSTRAINT "seo_compare_pages_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "internal_links" ADD CONSTRAINT "internal_links_source_tool_id_fkey" FOREIGN KEY ("source_tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
