import { Module } from "@nestjs/common";
import { CrawlerController } from "./crawler.controller";
import { CrawlSourcesService } from "./crawl-sources.service";
import { CrawlJobsService } from "./crawl-jobs.service";
import { CrawlIngestionService } from "./crawl-ingestion.service";
import { CrawlDashboardService } from "./crawl-dashboard.service";

@Module({
  controllers: [CrawlerController],
  providers: [CrawlSourcesService, CrawlJobsService, CrawlIngestionService, CrawlDashboardService],
  exports: [CrawlSourcesService, CrawlJobsService, CrawlIngestionService],
})
export class CrawlerModule {}
