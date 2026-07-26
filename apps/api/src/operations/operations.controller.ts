import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { OperationsService } from "./operations.service";

@ApiTags("operations")
@Controller("operations")
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get("dashboard")
  @RequirePermission(PermissionCode.DashboardView)
  @ApiOperation({ summary: "Admin dashboard statistics" })
  dashboard() {
    return this.operationsService.getDashboardStats();
  }
}
