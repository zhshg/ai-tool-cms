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
  code: string;
  name: string;
  module: string;
};

export type AuthRole = {
  id: string;
  code: string;
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
