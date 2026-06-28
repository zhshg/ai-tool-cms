import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import {
  GrowthCenterService,
  PartnerService,
  PlatformService,
  RevenueService,
} from "./platform.service";

@ApiTags("platform")
@Controller("platform")
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get("scopes")
  @RequirePermission(PermissionCode.PlatformRead)
  @ApiOperation({ summary: "API scopes (Commit 066)" })
  scopes() {
    return this.platformService.scopes();
  }

  @Get("api-keys")
  @RequirePermission(PermissionCode.PlatformRead)
  listApiKeys(@CurrentUser() user: RequestUser) {
    return this.platformService.listApiKeys(user.id);
  }

  @Post("api-keys")
  @RequirePermission(PermissionCode.PlatformManage)
  createApiKey(@CurrentUser() user: RequestUser, @Body() body: { name: string; scopes: string[] }) {
    return this.platformService.createApiKey(user.id, body.name, body.scopes);
  }

  @Post("api-keys/:id/revoke")
  @RequirePermission(PermissionCode.PlatformManage)
  revokeApiKey(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.platformService.revokeApiKey(user.id, id);
  }

  @Get("api-keys/:id/usage")
  @RequirePermission(PermissionCode.PlatformRead)
  apiKeyUsage(@Param("id") id: string) {
    return this.platformService.getApiKeyUsage(id);
  }

  @Get("webhooks")
  @RequirePermission(PermissionCode.PlatformRead)
  @ApiOperation({ summary: "Webhooks (Commit 067)" })
  webhooks(@CurrentUser() user: RequestUser) {
    return this.platformService.listWebhooks(user.id);
  }

  @Post("webhooks")
  @RequirePermission(PermissionCode.PlatformManage)
  createWebhook(
    @CurrentUser() user: RequestUser,
    @Body() body: { name: string; url: string; events: string[] },
  ) {
    return this.platformService.createWebhook(user.id, body);
  }

  @Get("email-templates")
  @RequirePermission(PermissionCode.MonetizationRead)
  @ApiOperation({ summary: "Email templates (Commit 065)" })
  emailTemplates() {
    return this.platformService.listEmailTemplates();
  }

  @Post("email-templates")
  @RequirePermission(PermissionCode.MonetizationManage)
  createEmailTemplate(
    @Body()
    body: {
      slug: string;
      name: string;
      type: string;
      subject: string;
      bodyHtml: string;
      bodyText?: string;
    },
  ) {
    return this.platformService.createEmailTemplate(body);
  }
}

@ApiTags("revenue")
@Controller("revenue")
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get("overview")
  @RequirePermission(PermissionCode.RevenueRead)
  @ApiOperation({ summary: "Revenue dashboard (Commit 069)" })
  overview() {
    return this.revenueService.overview();
  }
}

@ApiTags("growth")
@Controller("growth")
export class GrowthCenterController {
  constructor(private readonly growthService: GrowthCenterService) {}

  @Get("center")
  @RequirePermission(PermissionCode.GrowthRead)
  @ApiOperation({ summary: "Growth Center (Commit 070)" })
  center() {
    return this.growthService.dashboard();
  }
}

@ApiTags("partners")
@Controller("partners")
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get("dashboard")
  @RequirePermission(PermissionCode.PartnerRead)
  @ApiOperation({ summary: "Partner dashboard (Commit 068)" })
  dashboard(@CurrentUser() user: RequestUser) {
    return this.partnerService.getDashboard(user.id);
  }
}
