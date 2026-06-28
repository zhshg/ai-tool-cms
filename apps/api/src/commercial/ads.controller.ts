import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { Public, RequirePermission } from "../common/decorators";
import { AdsService } from "./ads.service";

@ApiTags("ads")
@Controller("ads")
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get("networks")
  @RequirePermission(PermissionCode.MonetizationRead)
  networks() {
    return this.adsService.networks();
  }

  @Get("slots")
  @RequirePermission(PermissionCode.MonetizationRead)
  @ApiOperation({ summary: "Ad slots admin list (Commit 063)" })
  slots() {
    return this.adsService.listAllAdmin();
  }

  @Post("slots")
  @RequirePermission(PermissionCode.MonetizationManage)
  createSlot(
    @Body()
    body: {
      slug: string;
      name: string;
      network: string;
      position: string;
      sortOrder?: number;
      config?: Record<string, unknown>;
    },
  ) {
    return this.adsService.createSlot(body);
  }

  @Patch("slots/:id")
  @RequirePermission(PermissionCode.MonetizationManage)
  updateSlot(
    @Param("id") id: string,
    @Body() body: { sortOrder?: number; config?: Record<string, unknown> },
  ) {
    return this.adsService.updateSlot(id, body);
  }

  @Public()
  @Get("render")
  @ApiOperation({ summary: "Public ad slots by position" })
  render() {
    return this.adsService.listByPosition();
  }
}
