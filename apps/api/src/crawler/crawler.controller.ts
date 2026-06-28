import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CrawlSourcesService } from "./crawl-sources.service";
import { CrawlJobsService } from "./crawl-jobs.service";
import { CrawlDashboardService } from "./crawl-dashboard.service";
import {
  CreateCrawlSourceDto,
  TriggerCrawlJobDto,
  UpdateCrawlFrequencyDto,
  UpdateCrawlSourceDto,
} from "./dto/crawl-source.dto";

@ApiTags("crawler")
@Controller("crawler")
export class CrawlerController {
  constructor(
    private readonly sourcesService: CrawlSourcesService,
    private readonly jobsService: CrawlJobsService,
    private readonly dashboardService: CrawlDashboardService,
  ) {}

  @Get("dashboard")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Crawler dashboard metrics" })
  dashboard() {
    return this.dashboardService.getSummary();
  }

  @Get("sources")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl sources" })
  listSources(@Query() query: PaginationQueryDto) {
    return this.sourcesService.list(query);
  }

  @Get("sources/:id")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Get crawl source" })
  getSource(@Param("id") id: string) {
    return this.sourcesService.findById(id);
  }

  @Post("sources")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Create crawl source" })
  createSource(@Body() dto: CreateCrawlSourceDto, @CurrentUser() user: RequestUser) {
    return this.sourcesService.create(dto, user.id);
  }

  @Put("sources/:id")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Update crawl source" })
  updateSource(
    @Param("id") id: string,
    @Body() dto: UpdateCrawlSourceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sourcesService.update(id, dto, user.id);
  }

  @Post("sources/:id/enable")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Enable crawl source" })
  enableSource(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.sourcesService.setStatus(id, "ENABLED", user.id);
  }

  @Post("sources/:id/disable")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Disable crawl source" })
  disableSource(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.sourcesService.setStatus(id, "DISABLED", user.id);
  }

  @Post("sources/:id/pause")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Pause crawl source" })
  pauseSource(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.sourcesService.setStatus(id, "PAUSED", user.id);
  }

  @Patch("sources/:id/frequency")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Adjust crawl frequency" })
  updateFrequency(
    @Param("id") id: string,
    @Body() dto: UpdateCrawlFrequencyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sourcesService.updateFrequency(id, dto, user.id);
  }

  @Get("jobs")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl jobs" })
  listJobs(@Query() query: PaginationQueryDto) {
    return this.jobsService.list(query);
  }

  @Post("jobs")
  @RequirePermission(PermissionCode.CrawlerRun)
  @ApiOperation({ summary: "Trigger manual crawl" })
  triggerJob(@Body() dto: TriggerCrawlJobDto, @CurrentUser() user: RequestUser) {
    return this.jobsService.triggerManual(dto.sourceId, user.id);
  }

  @Get("queues")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Queue depth overview" })
  queues() {
    return this.jobsService.getQueueOverview();
  }
}
