-- Add missing source kind enum and column for crawler source registry.
DO $$
BEGIN
  CREATE TYPE "CrawlSourceKind" AS ENUM ('TOOLS', 'NEWS', 'BLOG', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "crawl_sources"
ADD COLUMN IF NOT EXISTS "kind" "CrawlSourceKind" NOT NULL DEFAULT 'CUSTOM';
