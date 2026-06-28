import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { AutomationService } from "./automation.service";

@ApiTags("automation")
@Controller("automation")
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get("center")
  @RequirePermission(PermissionCode.AutomationRead)
  @ApiOperation({ summary: "Automation Center dashboard (Commit 090)" })
  center() {
    return this.automationService.center();
  }

  @Get("discovery")
  @RequirePermission(PermissionCode.AutomationRead)
  @ApiOperation({ summary: "Discovery dashboard (Commit 081)" })
  discovery() {
    return this.automationService.discoveryDashboard();
  }

  @Get("discovery/results")
  @RequirePermission(PermissionCode.AutomationRead)
  discoveryResults(@Query("limit") limit?: string) {
    return this.automationService.listDiscoveryResults(limit ? Number(limit) : 50);
  }

  @Post("discovery/run")
  @RequirePermission(PermissionCode.AutomationManage)
  runDiscovery() {
    return this.automationService.triggerDiscovery();
  }

  @Post("discovery/results/:id/dismiss")
  @RequirePermission(PermissionCode.AutomationManage)
  dismissResult(@Param("id") id: string) {
    return this.automationService.dismissDiscoveryResult(id);
  }

  @Post("bootstrap")
  @RequirePermission(PermissionCode.AutomationManage)
  bootstrap() {
    return this.automationService.bootstrap();
  }

  @Post("daily")
  @RequirePermission(PermissionCode.AutomationManage)
  runDaily() {
    return this.automationService.runDaily();
  }

  @Post("weekly")
  @RequirePermission(PermissionCode.AutomationManage)
  runWeekly() {
    return this.automationService.runWeekly();
  }

  @Post("screenshots/:toolId")
  @RequirePermission(PermissionCode.AutomationManage)
  screenshots(@Param("toolId") toolId: string) {
    return this.automationService.triggerScreenshots(toolId);
  }

  @Post("social")
  @RequirePermission(PermissionCode.AutomationManage)
  social(@Body() body: { template?: "NEW_AI" | "TRENDING_AI" | "WEEKLY_AI" | "TOP_AI" }) {
    return this.automationService.triggerSocial(body.template ?? "WEEKLY_AI");
  }

  @Post("index")
  @RequirePermission(PermissionCode.AutomationManage)
  index() {
    return this.automationService.triggerIndex();
  }

  @Get("mcp")
  @RequirePermission(PermissionCode.AutomationRead)
  @ApiOperation({ summary: "MCP Server connection info (AI Native Interface)" })
  mcp() {
    return this.automationService.mcpInfo();
  }
}
