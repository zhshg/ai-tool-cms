import type { PermissionCode } from "./permissions";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: PermissionCode[];
};

export function hasPermission(
  user: AuthUser | null,
  permission: PermissionCode,
): boolean {
  if (!user) {
    return false;
  }

  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null,
  permissions: PermissionCode[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function filterByPermission<T extends { permission?: PermissionCode }>(
  items: T[],
  user: AuthUser | null,
): T[] {
  return items.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );
}
