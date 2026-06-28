import { Injectable } from "@nestjs/common";
import {
  flattenPermissions,
  hasPermission,
  type AuthPermission,
  type AuthRole,
  type AuthUser,
} from "@ai-tool-cms/auth";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async loadAuthUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.client.user.findFirst({
      where: { id: userId, ...activeOnly, status: "ACTIVE" },
      include: {
        roles: {
          where: activeOnly,
          include: {
            role: {
              include: {
                permissions: {
                  where: activeOnly,
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const roles: AuthRole[] = user.roles.map((userRole) => ({
      id: userRole.role.id,
      code: userRole.role.code,
      name: userRole.role.name,
      permissions: userRole.role.permissions.map((rolePermission) =>
        this.toAuthPermission(rolePermission.permission),
      ),
    }));

    const permissions = flattenPermissions(roles);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.status === "ACTIVE",
      roles,
      permissions,
    };
  }

  can(user: AuthUser, permissionCode: string): boolean {
    return hasPermission(user, permissionCode);
  }

  private toAuthPermission(permission: {
    id: string;
    code: string;
    name: string;
    module: string;
  }): AuthPermission {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      module: permission.module,
    };
  }
}
