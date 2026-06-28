import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { WebhookHubService } from "./webhook-hub.service";

@ApiTags("webhook-hub")
@Controller("webhook-hub")
export class WebhookHubController {
  constructor(private readonly hub: WebhookHubService) {}

  @Get("events")
  @RequirePermission(PermissionCode.PlatformRead)
  @ApiOperation({ summary: "Webhook event catalog (Commit 095)" })
  events() {
    return this.hub.eventCatalog();
  }

  @Get("deliveries")
  @RequirePermission(PermissionCode.PlatformRead)
  deliveries(@Query("webhookId") webhookId?: string, @Query("limit") limit?: string) {
    return this.hub.listDeliveries(webhookId, limit ? Number(limit) : 50);
  }

  @Post("deliveries/:id/retry")
  @RequirePermission(PermissionCode.PlatformManage)
  retry(@Param("id") id: string) {
    return this.hub.retryDelivery(id);
  }

  @Post("webhooks/:id/test")
  @RequirePermission(PermissionCode.PlatformManage)
  test(@Param("id") id: string) {
    return this.hub.emitTestEvent(id);
  }
}
