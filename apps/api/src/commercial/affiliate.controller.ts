import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import type { Request } from "express";
import { Public, RequirePermission } from "../common/decorators";
import { AffiliateService } from "./affiliate.service";

@ApiTags("affiliate")
@Controller("affiliate")
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get("networks")
  @RequirePermission(PermissionCode.MonetizationRead)
  @ApiOperation({ summary: "Supported affiliate networks (Commit 061)" })
  networks() {
    return this.affiliateService.networks();
  }

  @Get("programs")
  @RequirePermission(PermissionCode.MonetizationRead)
  programs() {
    return this.affiliateService.listPrograms();
  }

  @Get("links")
  @RequirePermission(PermissionCode.MonetizationRead)
  links(@Query("toolId") toolId?: string) {
    return this.affiliateService.listLinks(toolId);
  }

  @Get("stats")
  @RequirePermission(PermissionCode.MonetizationRead)
  stats(@Query("linkId") linkId?: string, @Query("toolId") toolId?: string) {
    return this.affiliateService.getStats(linkId, toolId);
  }

  @Get("tools/:toolId")
  @RequirePermission(PermissionCode.MonetizationRead)
  toolOverview(@Param("toolId") toolId: string) {
    return this.affiliateService.getToolOverview(toolId);
  }

  @Public()
  @Get("go/:linkId")
  @ApiOperation({ summary: "Affiliate redirect with click tracking" })
  async go(@Param("linkId") linkId: string, @Req() req: Request) {
    const url = await this.affiliateService.redirect(linkId, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referrer: req.headers.referer,
    });
    return { redirectUrl: url };
  }
}
