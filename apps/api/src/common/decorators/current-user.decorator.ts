import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "@ai-tool-cms/auth";

export type RequestUser = AuthUser & { accessToken: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    return request.user;
  },
);
