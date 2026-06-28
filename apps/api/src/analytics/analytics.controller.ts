import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("providers")
  @RequirePermission(PermissionCode.AnalyticsRead)
  @ApiOperation({ summary: "Analytics provider status (Commit 058)" })
  providers() {
    return this.analyticsService.getProviders();
  }

  @Get("overview")
  @RequirePermission(PermissionCode.AnalyticsRead)
  @ApiOperation({ summary: "Analytics overview — PV, UV, CTR, bounce, top pages" })
  overview() {
    return this.analyticsService.getOverview();
  }
}
