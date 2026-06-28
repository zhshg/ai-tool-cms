import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { Public, RequirePermission } from "../common/decorators";
import { SponsoredService } from "./sponsored.service";

@ApiTags("sponsored")
@Controller("sponsored")
export class SponsoredController {
  constructor(private readonly sponsoredService: SponsoredService) {}

  @Get()
  @RequirePermission(PermissionCode.MonetizationRead)
  @ApiOperation({ summary: "List sponsored placements (Commit 062)" })
  list() {
    return this.sponsoredService.list();
  }

  @Post()
  @RequirePermission(PermissionCode.MonetizationManage)
  create(
    @Body()
    body: {
      toolId: string;
      type: string;
      weight?: number;
      startAt?: string;
      endAt?: string;
      regions?: string[];
      devices?: string[];
    },
  ) {
    return this.sponsoredService.create(body);
  }

  @Public()
  @Get("active")
  @ApiOperation({ summary: "Active sponsored slots for homepage" })
  active(@Query("region") region?: string, @Query("device") device?: string) {
    return this.sponsoredService.getActive(region, device);
  }
}
