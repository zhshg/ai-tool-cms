import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { logApiKeyUsage } from "@ai-tool-cms/api-platform";
import { PrismaService } from "../../prisma/prisma.service";
import type { ApiKeyRequest } from "../decorators/api-key.decorator";

@Injectable()
export class ApiKeyUsageInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<ApiKeyRequest & { method?: string; url?: string }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        finalize: () => {
          if (!request.apiKey) return;
          void logApiKeyUsage(
            this.prisma.client,
            request.apiKey.id,
            request.url ?? "unknown",
            request.method ?? "GET",
            response.statusCode ?? 200,
            Date.now() - start,
          );
        },
      }),
    );
  }
}
