import { ForbiddenException, Injectable } from "@nestjs/common";
import { hasAnyPermission, type AuthUser } from "@ai-tool-cms/auth";

@Injectable()
export class RbacPolicy {
  assert(user: AuthUser, ...permissions: string[]): void {
    if (!hasAnyPermission(user, permissions)) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }

  can(user: AuthUser, permission: string): boolean {
    return hasAnyPermission(user, [permission]);
  }
}
