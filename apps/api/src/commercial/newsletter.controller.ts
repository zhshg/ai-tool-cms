import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { Public, RequirePermission } from "../common/decorators";
import { NewsletterService } from "./newsletter.service";

@ApiTags("newsletter")
@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post("subscribe")
  @ApiOperation({ summary: "Newsletter subscribe (Commit 064)" })
  subscribe(@Body() body: { email: string; locale?: string }) {
    return this.newsletterService.subscribe(body.email, body.locale);
  }

  @Public()
  @Get("confirm")
  confirm(@Query("token") token: string) {
    return this.newsletterService.confirm(token);
  }

  @Get("campaigns")
  @RequirePermission(PermissionCode.MonetizationRead)
  campaigns() {
    return this.newsletterService.listCampaigns();
  }

  @Get("types")
  @RequirePermission(PermissionCode.MonetizationRead)
  types() {
    return this.newsletterService.campaignTypes();
  }

  @Post("campaigns")
  @RequirePermission(PermissionCode.MonetizationManage)
  createCampaign(@Body() body: { type: string; categoryId?: string; scheduledAt?: string }) {
    return this.newsletterService.createCampaign(body);
  }

  @Post("campaigns/:id/send")
  @RequirePermission(PermissionCode.MonetizationManage)
  send(@Param("id") id: string) {
    return this.newsletterService.sendCampaign(id);
  }

  @Get("subscribers/count")
  @RequirePermission(PermissionCode.MonetizationRead)
  subscriberCount() {
    return this.newsletterService.getSubscriberCount();
  }
}
