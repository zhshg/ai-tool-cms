import { Module } from "@nestjs/common";
import { WebhookHubController } from "./webhook-hub.controller";
import { WebhookHubService } from "./webhook-hub.service";

@Module({
  controllers: [WebhookHubController],
  providers: [WebhookHubService],
  exports: [WebhookHubService],
})
export class WebhookHubModule {}
