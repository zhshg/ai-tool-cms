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

  @Post("tools/:toolId/regenerate")
  @RequirePermission(PermissionCode.AiManage)
  @ApiOperation({ summary: "Regenerate AI content for tool" })
  regenerate(@Param("toolId") toolId: string, @CurrentUser() user: RequestUser) {
    return this.reviewService.regenerate(toolId, user.id);
  }
}
