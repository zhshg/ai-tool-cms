import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { MonetizationService } from "./monetization.service";

@ApiTags("monetization")
@Controller("monetization")
export class MonetizationController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Get("dashboard")
  @RequirePermission(PermissionCode.MonetizationRead)
  @ApiOperation({ summary: "Monetization operations dashboard" })
  dashboard() {
    return this.monetizationService.dashboard();
  }
}
