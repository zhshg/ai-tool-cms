-- CreateEnum
CREATE TYPE "CrawlSourceStatus" AS ENUM ('ENABLED', 'DISABLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "CrawlSchedule" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "CrawlQueueJobType" AS ENUM ('CRAWL_TOOL', 'CRAWL_CATEGORY', 'CRAWL_DETAIL', 'CRAWL_IMAGE', 'NORMALIZE');

-- AlterTable
ALTER TABLE "crawl_jobs" ADD COLUMN     "job_type" "CrawlQueueJobType" NOT NULL DEFAULT 'CRAWL_TOOL';

-- AlterTable
ALTER TABLE "crawl_sources" ADD COLUMN     "crawl_interval_minutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "last_run_at" TIMESTAMP(3),
ADD COLUMN     "next_run_at" TIMESTAMP(3),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "robots_txt" TEXT,
ADD COLUMN     "schedule" "CrawlSchedule" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "status" "CrawlSourceStatus" NOT NULL DEFAULT 'ENABLED';

-- CreateIndex
CREATE INDEX "crawl_jobs_job_type_idx" ON "crawl_jobs"("job_type");

-- CreateIndex
CREATE INDEX "crawl_sources_status_idx" ON "crawl_sources"("status");

-- CreateIndex
CREATE INDEX "crawl_sources_schedule_idx" ON "crawl_sources"("schedule");

-- CreateIndex
CREATE INDEX "crawl_sources_priority_idx" ON "crawl_sources"("priority");

-- CreateIndex
CREATE INDEX "crawl_sources_next_run_at_idx" ON "crawl_sources"("next_run_at");

-- CreateIndex
CREATE INDEX "crawl_sources_last_run_at_idx" ON "crawl_sources"("last_run_at");
