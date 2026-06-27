import bcrypt from "bcryptjs";

export const PASSWORD_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export type JwtAccessPayload = {
  sub: string;
  email: string;
  type: "access";
};

export type JwtRefreshPayload = {
  sub: string;
  tokenId: string;
  type: "refresh";
};

export type AuthPermission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

export type AuthRole = {
  id: string;
  name: string;
  permissions: AuthPermission[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  roles: AuthRole[];
  permissions: AuthPermission[];
};

export function flattenPermissions(roles: AuthRole[]): AuthPermission[] {
  const permissionMap = new Map<string, AuthPermission>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      permissionMap.set(permission.id, permission);
    }
  }

  return [...permissionMap.values()];
}

export function hasRole(user: Pick<AuthUser, "roles">, roleName: string): boolean {
  return user.roles.some((role) => role.name === roleName);
}

export function hasPermission(user: Pick<AuthUser, "permissions">, permissionName: string): boolean {
  return user.permissions.some((permission) => permission.name === permissionName);
}
