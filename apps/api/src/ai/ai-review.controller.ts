import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { AiReviewService } from "./ai-review.service";
import { ListRevisionsQueryDto } from "./dto/list-revisions.dto";
import { ReviewRevisionDto } from "./dto/review-revision.dto";

@ApiTags("ai")
@Controller("ai")
export class AiReviewController {
  constructor(private readonly reviewService: AiReviewService) {}

  @Get("revisions")
  @RequirePermission(PermissionCode.AiRead)
  @ApiOperation({ summary: "List AI content revisions" })
  listRevisions(@Query() query: ListRevisionsQueryDto) {
    return this.reviewService.listRevisions(query);
  }

  @Get("revisions/:id")
  @RequirePermission(PermissionCode.AiRead)
  @ApiOperation({ summary: "Get content revision" })
  getRevision(@Param("id") id: string) {
    return this.reviewService.findRevision(id);
  }

  @Get("revisions/:id/compare")
  @RequirePermission(PermissionCode.AiRead)
  @ApiOperation({ summary: "Compare AI revision with current tool content" })
  compare(@Param("id") id: string) {
    return this.reviewService.compare(id);
  }

  @Post("revisions/:id/edit")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Edit AI revision payload before approval" })
  editRevision(
    @Param("id") id: string,
    @Body() body: { payload?: unknown; reviewNote?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviewService.updateRevisionPayload(
      id,
      user.id,
      body.payload ?? {},
      body.reviewNote,
    );
  }

  @Post("revisions/bulk-approve")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Bulk approve AI revisions" })
  bulkApprove(
    @Body() body: { revisionIds?: string[]; reviewNote?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviewService.bulkApprove(body.revisionIds ?? [], user.id, body.reviewNote);
  }

  @Post("revisions/bulk-reject")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Bulk reject AI revisions" })
  bulkReject(
    @Body() body: { revisionIds?: string[]; reviewNote?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviewService.bulkReject(body.revisionIds ?? [], user.id, body.reviewNote);
  }

  @Post("revisions/:id/approve")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Approve revision and apply to tool" })
  approve(
    @Param("id") id: string,
    @Body() dto: ReviewRevisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviewService.approve(id, user.id, dto.reviewNote);
  }

  @Post("revisions/:id/reject")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Reject revision" })
  reject(
    @Param("id") id: string,
    @Body() dto: ReviewRevisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviewService.reject(id, user.id, dto.reviewNote);
  }

  @Post("tools/:toolId/publish")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Publish approved tool" })
  publishTool(@Param("toolId") toolId: string, @CurrentUser() user: RequestUser) {
    return this.reviewService.publishTool(toolId, user.id);
  }

  @Post("tools/:toolId/archive")
  @RequirePermission(PermissionCode.AiReview)
  @ApiOperation({ summary: "Archive tool from review workflow" })
  archiveTool(@Param("toolId") toolId: string, @CurrentUser() user: RequestUser) {
    return this.reviewService.archiveTool(toolId, user.id);
  }

  @Get("tools/:toolId/history")
  @RequirePermission(PermissionCode.AiRead)
  @ApiOperation({ summary: "Tool AI review history and audit log" })
  history(@Param("toolId") toolId: string) {
    return this.reviewService.history(toolId);
  }

  @Post("tools/bulk-generate")
  @RequirePermission(PermissionCode.AiManage)
  @ApiOperation({ summary: "Bulk generate AI content for tools" })
  bulkGenerate(@Body() body: { toolIds?: string[] }, @CurrentUser() user: RequestUser) {
    return this.reviewService.bulkRegenerate(body.toolIds ?? [], user.id);
  }

  @Post("tools/:toolId/regenerate")
  @RequirePermission(PermissionCode.AiManage)
  @ApiOperation({ summary: "Regenerate AI content for tool" })
  regenerate(@Param("toolId") toolId: string, @CurrentUser() user: RequestUser) {
    return this.reviewService.regenerate(toolId, user.id);
  }
}
