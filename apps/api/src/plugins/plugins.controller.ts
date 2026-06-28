import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { PluginsService } from "./plugins.service";

@ApiTags("plugins")
@Controller("plugins")
export class PluginsController {
  constructor(private readonly plugins: PluginsService) {}

  @Get()
  @RequirePermission(PermissionCode.PlatformRead)
  @ApiOperation({ summary: "List plugin registrations (Commit 096)" })
  list() {
    return this.plugins.listRegistrations();
  }

  @Get("lifecycles")
  @RequirePermission(PermissionCode.PlatformRead)
  lifecycles() {
    return this.plugins.lifecycles();
  }
}
