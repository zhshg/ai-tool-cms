export const Permission = {
  DashboardView: "dashboard:view",
  ToolsRead: "tools:read",
  CategoriesRead: "categories:read",
  UsersManage: "users:manage",
  SettingsRead: "settings:read",
  CrawlerRead: "crawler:read",
  CrawlerManage: "crawler:manage",
  CrawlerRun: "crawler:run",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const RolePermissions: Record<string, PermissionCode[]> = {
  admin: [
    Permission.DashboardView,
    Permission.ToolsRead,
    Permission.CategoriesRead,
    Permission.CrawlerRead,
    Permission.CrawlerManage,
    Permission.CrawlerRun,
    Permission.UsersManage,
    Permission.SettingsRead,
  ],
  editor: [
    Permission.DashboardView,
    Permission.ToolsRead,
    Permission.CategoriesRead,
    Permission.CrawlerRead,
    Permission.CrawlerRun,
  ],
};
