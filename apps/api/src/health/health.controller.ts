import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { env } from "@ai-tool-cms/config";
import { Public } from "../common/decorators";
import { PrismaService } from "../prisma/prisma.service";
import { HealthResponseDto } from "./health-response.dto";

function serviceStatus(url?: string): string {
  return url ? "configured" : "missing";
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Service health check" })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: this.prisma.isConnected(),
        redis: serviceStatus(env.REDIS_URL),
        meilisearch: serviceStatus(env.MEILI_URL),
        storage: serviceStatus(env.STORAGE_ENDPOINT),
        mail: serviceStatus(env.SMTP_HOST),
      },
    };
  }
}
