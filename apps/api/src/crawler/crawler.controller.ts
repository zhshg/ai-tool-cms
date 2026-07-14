import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CrawlSourcesService } from "./crawl-sources.service";
import { CrawlJobsService } from "./crawl-jobs.service";
import { CrawlDashboardService } from "./crawl-dashboard.service";
import { CrawlWorkflowService } from "./crawl-workflow.service";
import {
  CreateCrawlFieldDefineDto,
  CreateCrawlRuleDto,
  CreateCrawlSourceDto,
  CrawlRecordsQueryDto,
  PreviewCrawlStepDto,
  RunCrawlRuleDto,
  TriggerCrawlJobDto,
  UpdateCrawlFieldDefineDto,
  UpdateCrawlRuleDto,
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
    private readonly workflowService: CrawlWorkflowService,
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

  @Get("sources/:id/graph")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Get crawl source graph" })
  getSourceGraph(@Param("id") id: string) {
    return this.sourcesService.getSourceGraph(id);
  }

  @Post("sources/:id/test")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Preview crawl step result" })
  testSourceStep(@Param("id") id: string, @Body() dto: PreviewCrawlStepDto) {
    return this.sourcesService.testStep(id, dto);
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

  @Get("sources/:id/rules")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl rules" })
  listSourceRules(@Param("id") id: string) {
    return this.sourcesService.listRules(id);
  }

  @Post("sources/:id/rules")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Create crawl rule" })
  createSourceRule(
    @Param("id") id: string,
    @Body() dto: CreateCrawlRuleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sourcesService.createRule(id, dto, user.id);
  }

  @Put("rules/:id")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Update crawl rule" })
  updateRule(
    @Param("id") id: string,
    @Body() dto: UpdateCrawlRuleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sourcesService.updateRule(id, dto, user.id);
  }

  @Delete("rules/:id")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Delete crawl rule" })
  deleteRule(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.sourcesService.deleteRule(id, user.id);
  }

  @Post("rules/:id/run")
  @RequirePermission(PermissionCode.CrawlerRun)
  @ApiOperation({ summary: "Run crawl rule as dry-run and save artifacts" })
  runRule(@Param("id") id: string, @Body() dto: RunCrawlRuleDto, @CurrentUser() user: RequestUser) {
    return this.sourcesService.runRule(id, dto, user.id);
  }

  @Get("rules/:id/fields")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl fields" })
  listRuleFields(@Param("id") id: string) {
    return this.sourcesService.listFields(undefined, id);
  }

  @Get("fields")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl fields with filters" })
  listFields(@Query("sourceId") sourceId?: string, @Query("ruleId") ruleId?: string) {
    return this.sourcesService.listFields(sourceId, ruleId);
  }

  @Post("rules/:id/fields")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Create crawl field" })
  createRuleField(
    @Param("id") id: string,
    @Body() dto: CreateCrawlFieldDefineDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sourcesService.createField(id, dto, user.id);
  }

  @Put("fields/:id")
  @RequirePermission(PermissionCode.CrawlerManage)
  @ApiOperation({ summary: "Update crawl field" })
  updateField(
    @Param("id") id: string,
    @Body() dto: UpdateCrawlFieldDefineDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sourcesService.updateField(id, dto, user.id);
  }

  @Get("records")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl records" })
  listRecords(@Query() query: PaginationQueryDto, @Query() recordQuery: CrawlRecordsQueryDto) {
    return this.sourcesService.listRecords({ ...query, ...recordQuery });
  }

  @Get("artifacts")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List saved crawler candidate artifacts" })
  listArtifacts(@Query("source") source?: string, @Query("pageSize") pageSize?: string) {
    const limit = pageSize ? Number(pageSize) : 20;
    return this.sourcesService.listArtifacts(source, Number.isFinite(limit) ? limit : 20);
  }

  @Get("artifacts/:fileName")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Get saved crawler candidate artifact content" })
  getArtifact(@Param("fileName") fileName: string) {
    return this.sourcesService.getArtifact(fileName);
  }

  @Get("jobs")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawl jobs" })
  listJobs(@Query() query: PaginationQueryDto) {
    return this.jobsService.list(query);
  }

  @Get("jobs/recent")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List recent crawl jobs" })
  recentJobs() {
    return this.jobsService.listRecent();
  }

  @Get("draft-tools")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "List crawler draft tools" })
  draftTools(@Query("pageSize") pageSize?: string) {
    const limit = pageSize ? Number(pageSize) : 50;
    return this.jobsService.listDraftTools(Number.isFinite(limit) ? limit : 50);
  }

  @Post("jobs")
  @RequirePermission(PermissionCode.CrawlerRun)
  @ApiOperation({ summary: "Trigger manual crawl" })
  triggerJob(@Body() dto: TriggerCrawlJobDto, @CurrentUser() user: RequestUser) {
    return this.jobsService.triggerManual(dto.sourceId, user.id);
  }

  @Post("sources/:id/run-flow")
  @RequirePermission(PermissionCode.CrawlerRun)
  @ApiOperation({ summary: "Run crawler flow from list to ingest" })
  runFlow(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.workflowService.runSource(id, user.id);
  }

  @Get("queues")
  @RequirePermission(PermissionCode.CrawlerRead)
  @ApiOperation({ summary: "Queue depth overview" })
  queues() {
    return this.jobsService.getQueueOverview();
  }
}
