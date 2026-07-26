import { Module } from "@nestjs/common";
import { CrawlerController } from "./crawler.controller";
import { CrawlSourcesService } from "./crawl-sources.service";
import { CrawlJobsService } from "./crawl-jobs.service";
import { CrawlIngestionService } from "./crawl-ingestion.service";
import { CrawlDashboardService } from "./crawl-dashboard.service";
import { CrawlerBootstrapService } from "./crawler-bootstrap.service";
import { CrawlWorkflowService } from "./crawl-workflow.service";

@Module({
  controllers: [CrawlerController],
  providers: [
    CrawlerBootstrapService,
    CrawlSourcesService,
    CrawlJobsService,
    CrawlIngestionService,
    CrawlDashboardService,
    CrawlWorkflowService,
  ],
  exports: [CrawlSourcesService, CrawlJobsService, CrawlIngestionService, CrawlWorkflowService],
})
export class CrawlerModule {}
