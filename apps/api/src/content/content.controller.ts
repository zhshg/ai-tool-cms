import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { ContentService } from "./content.service";
import { BulkImproveContentDto, MergeDuplicateToolsDto } from "./dto/content-ops.dto";

@ApiTags("content")
@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get("dataset")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Production dataset manager dashboard" })
  dataset() {
    return this.contentService.getDatasetDashboard();
  }

  @Get("duplicates")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Detect duplicate tools by website, slug, and name" })
  duplicates() {
    return this.contentService.detectDuplicates();
  }

  @Get("missing-content")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Report tools missing launch-critical content fields" })
  missingContent() {
    return this.contentService.getMissingContentReport();
  }

  @Get("quality")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "AI content quality dashboard" })
  quality() {
    return this.contentService.getQualityDashboard();
  }

  @Post("quality/bulk-improve")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Queue AI improvement for low-quality tools" })
  bulkImprove(@Body() dto: BulkImproveContentDto, @CurrentUser() user: RequestUser) {
    return this.contentService.bulkImprove(dto.toolIds, user.id);
  }

  @Get("broken-websites")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Report tools with invalid or monitored broken websites" })
  brokenWebsites() {
    return this.contentService.getBrokenWebsiteReport();
  }

  @Post("duplicates/merge")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Merge a duplicate tool into a canonical tool" })
  mergeDuplicate(@Body() dto: MergeDuplicateToolsDto, @CurrentUser() user: RequestUser) {
    return this.contentService.mergeDuplicate(dto, user.id);
  }
}
