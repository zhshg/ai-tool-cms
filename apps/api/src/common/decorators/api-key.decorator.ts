import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { ValidatedApiKey } from "@ai-tool-cms/api-platform";

export const API_KEY_SCOPE_KEY = "apiKeyScope";
export const API_KEY_OPTIONAL_KEY = "apiKeyOptional";

/** 标记为 Public API 路由：跳过 JWT，要求 API Key */
export const ApiKeyAuth = (scope: string) => SetMetadata(API_KEY_SCOPE_KEY, scope);

export const ApiKeyOptional = () => SetMetadata(API_KEY_OPTIONAL_KEY, true);

export type ApiKeyRequest = {
  headers: Record<string, string | string[] | undefined>;
  apiKey?: ValidatedApiKey;
};

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ValidatedApiKey | undefined => {
    const request = ctx.switchToHttp().getRequest<ApiKeyRequest>();
    return request.apiKey;
  },
);
