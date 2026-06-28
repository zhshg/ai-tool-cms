import { Controller, Get, Header, HttpCode, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { env } from "@ai-tool-cms/config";
import { redisPing } from "@ai-tool-cms/cache";
import {
  aggregateHealth,
  renderPrometheusMetrics,
  runProbe,
  incrementCounter,
} from "@ai-tool-cms/monitoring";
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
  check(): HealthResponseDto {
    incrementCounter("health_checks_total", { endpoint: "health" });
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

  @Public()
  @Get("live")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Liveness probe (K8s)" })
  live() {
    return { status: "alive", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe — verifies DB + Redis" })
  async ready() {
    const probes = await Promise.all([
      runProbe("database", async () => {
        await this.prisma.client.$queryRaw`SELECT 1`;
        return true;
      }),
      runProbe("redis", redisPing),
    ]);
    const status = aggregateHealth(probes);
    incrementCounter("health_checks_total", { endpoint: "ready", status });
    return {
      status,
      timestamp: new Date().toISOString(),
      probes,
    };
  }

  @Public()
  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiOperation({ summary: "Prometheus metrics (Commit 105)" })
  metrics(@Res() res: Response) {
    res.send(renderPrometheusMetrics());
  }
}
