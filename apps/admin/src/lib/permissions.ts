export const Permission = {
  DashboardView: "dashboard:view",
  ToolsRead: "tools:read",
  CategoriesRead: "categories:read",
  UsersManage: "users:manage",
  SettingsRead: "settings:read",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const RolePermissions: Record<string, PermissionCode[]> = {
  admin: [
    Permission.DashboardView,
    Permission.ToolsRead,
    Permission.CategoriesRead,
    Permission.UsersManage,
    Permission.SettingsRead,
  ],
  editor: [
    Permission.DashboardView,
    Permission.ToolsRead,
    Permission.CategoriesRead,
  ],
};
