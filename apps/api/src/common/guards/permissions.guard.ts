import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasAnyPermission, type AuthUser } from "@ai-tool-cms/auth";
import { PERMISSIONS_KEY } from "../decorators/auth.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Missing authenticated user");
    }

    if (!hasAnyPermission(user, required)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
