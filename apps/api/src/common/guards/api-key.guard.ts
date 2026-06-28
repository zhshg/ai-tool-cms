import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { checkRateLimit, validateApiKey, type ApiScope } from "@ai-tool-cms/api-platform";
import { PrismaService } from "../../prisma/prisma.service";
import {
  API_KEY_OPTIONAL_KEY,
  API_KEY_SCOPE_KEY,
  type ApiKeyRequest,
} from "../decorators/api-key.decorator";

function extractApiKey(request: {
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const header = request.headers["x-api-key"];
  if (typeof header === "string" && header.startsWith("atcms_")) {
    return header;
  }

  const auth = request.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer atcms_")) {
    return auth.slice("Bearer ".length);
  }

  return null;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<string | undefined>(API_KEY_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const optional = this.reflector.getAllAndOverride<boolean>(API_KEY_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!scope && !optional) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const rawKey = extractApiKey(request);

    if (!rawKey) {
      if (optional) return true;
      throw new UnauthorizedException("API key required (X-Api-Key or Bearer atcms_...)");
    }

    const validated = await validateApiKey(this.prisma.client, rawKey, scope as ApiScope);
    if (!validated) {
      throw new UnauthorizedException("Invalid API key or insufficient scope");
    }

    const rate = checkRateLimit(validated.id);
    const response = context
      .switchToHttp()
      .getResponse<{ setHeader: (k: string, v: string) => void }>();
    response.setHeader("X-RateLimit-Remaining", String(rate.remaining));
    response.setHeader("X-RateLimit-Reset", rate.resetAt.toISOString());

    if (!rate.allowed) {
      throw new HttpException("Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    }

    request.apiKey = validated;
    return true;
  }
}
