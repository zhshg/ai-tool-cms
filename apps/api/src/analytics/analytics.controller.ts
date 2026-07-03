import { Controller, Get, Header, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { AnalyticsService, type AnalyticsPeriod } from "./analytics.service";

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
  @ApiOperation({
    summary: "Analytics overview for visitors, tools, categories, search, import and crawler",
  })
  overview(@Query("period") period?: AnalyticsPeriod) {
    return this.analyticsService.getOverview(period);
  }

  @Get("export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="analytics-dashboard.csv"')
  @RequirePermission(PermissionCode.AnalyticsRead)
  @ApiOperation({ summary: "Export analytics dashboard as CSV" })
  exportCsv(@Query("period") period?: AnalyticsPeriod) {
    return this.analyticsService.exportCsv(period);
  }
}
