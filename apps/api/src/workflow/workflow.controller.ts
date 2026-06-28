import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { WorkflowService } from "./workflow.service";
import type { WorkflowStep } from "@ai-tool-cms/workflow";

@ApiTags("workflow")
@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get("definitions")
  @RequirePermission(PermissionCode.PlatformRead)
  @ApiOperation({ summary: "List workflow definitions (Commit 097)" })
  definitions() {
    return this.workflow.listDefinitions();
  }

  @Get("definitions/:slug")
  @RequirePermission(PermissionCode.PlatformRead)
  definition(@Param("slug") slug: string) {
    return this.workflow.getDefinition(slug);
  }

  @Patch("definitions/:slug")
  @RequirePermission(PermissionCode.PlatformManage)
  updateDefinition(
    @Param("slug") slug: string,
    @Body() body: { steps?: WorkflowStep[]; isEnabled?: boolean; description?: string },
  ) {
    return this.workflow.updateDefinition(slug, body);
  }

  @Get("runs")
  @RequirePermission(PermissionCode.PlatformRead)
  runs(@Query("definition") definition?: string, @Query("limit") limit?: string) {
    return this.workflow.listRuns(definition, limit ? Number(limit) : 50);
  }

  @Post("definitions/:slug/runs")
  @RequirePermission(PermissionCode.PlatformManage)
  startRun(@Param("slug") slug: string, @Body() body: Record<string, unknown>) {
    return this.workflow.startRun(slug, body);
  }
}
