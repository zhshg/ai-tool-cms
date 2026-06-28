import type { AuthPermission, AuthRole, AuthUser } from "./types.js";

export function flattenPermissions(roles: AuthRole[]): AuthPermission[] {
  const permissionMap = new Map<string, AuthPermission>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      permissionMap.set(permission.code, permission);
    }
  }

  return [...permissionMap.values()];
}

export function hasRole(user: Pick<AuthUser, "roles">, roleCode: string): boolean {
  return user.roles.some((role) => role.code === roleCode);
}

export function hasPermission(
  user: Pick<AuthUser, "permissions">,
  permissionCode: string,
): boolean {
  return user.permissions.some((permission) => permission.code === permissionCode);
}

export function hasAnyPermission(
  user: Pick<AuthUser, "permissions">,
  permissionCodes: string[],
): boolean {
  return permissionCodes.some((code) => hasPermission(user, code));
}
