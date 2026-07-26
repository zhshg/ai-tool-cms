CREATE TABLE "blog_categories" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "meta_title" VARCHAR(160),
  "meta_description" VARCHAR(320),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "deleted_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blog_tags" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "deleted_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blog_articles" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(220) NOT NULL,
  "excerpt" VARCHAR(500),
  "content" TEXT NOT NULL,
  "status" "ToolStatus" NOT NULL DEFAULT 'DRAFT',
  "cover_image_url" VARCHAR(2048),
  "category_id" UUID,
  "author_id" UUID,
  "scheduled_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "meta_title" VARCHAR(160),
  "meta_description" VARCHAR(320),
  "og_image_url" VARCHAR(2048),
  "canonical_url" VARCHAR(2048),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "deleted_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blog_article_tags" (
  "id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "blog_article_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");
CREATE INDEX "blog_categories_sort_order_idx" ON "blog_categories"("sort_order");
CREATE INDEX "blog_categories_deleted_at_idx" ON "blog_categories"("deleted_at");
CREATE UNIQUE INDEX "blog_tags_slug_key" ON "blog_tags"("slug");
CREATE INDEX "blog_tags_deleted_at_idx" ON "blog_tags"("deleted_at");
CREATE UNIQUE INDEX "blog_articles_slug_key" ON "blog_articles"("slug");
CREATE INDEX "blog_articles_status_idx" ON "blog_articles"("status");
CREATE INDEX "blog_articles_category_id_idx" ON "blog_articles"("category_id");
CREATE INDEX "blog_articles_author_id_idx" ON "blog_articles"("author_id");
CREATE INDEX "blog_articles_published_at_idx" ON "blog_articles"("published_at");
CREATE INDEX "blog_articles_scheduled_at_idx" ON "blog_articles"("scheduled_at");
CREATE INDEX "blog_articles_deleted_at_idx" ON "blog_articles"("deleted_at");
CREATE UNIQUE INDEX "blog_article_tags_article_id_tag_id_key" ON "blog_article_tags"("article_id", "tag_id");
CREATE INDEX "blog_article_tags_tag_id_idx" ON "blog_article_tags"("tag_id");
CREATE INDEX "blog_article_tags_deleted_at_idx" ON "blog_article_tags"("deleted_at");

ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_article_tags" ADD CONSTRAINT "blog_article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "blog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_article_tags" ADD CONSTRAINT "blog_article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;