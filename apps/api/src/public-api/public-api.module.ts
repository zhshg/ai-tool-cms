import { Module } from "@nestjs/common";
import { PublicApiController } from "./public-api.controller";
import { PublicApiService } from "./public-api.service";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { ApiKeyUsageInterceptor } from "../common/interceptors/api-key-usage.interceptor";

@Module({
  controllers: [PublicApiController],
  providers: [PublicApiService, ApiKeyGuard, ApiKeyUsageInterceptor],
})
export class PublicApiModule {}
