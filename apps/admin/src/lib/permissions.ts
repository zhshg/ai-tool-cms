export const Permission = {
  DashboardView: "dashboard:view",
  ToolsRead: "tools:read",
  CategoriesRead: "categories:read",
  UsersManage: "users:manage",
  SettingsRead: "settings:read",
  CrawlerRead: "crawler:read",
  CrawlerManage: "crawler:manage",
  CrawlerRun: "crawler:run",
  AiRead: "ai:read",
  AiManage: "ai:manage",
  AiReview: "ai:review",
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
    Permission.AiRead,
    Permission.AiManage,
    Permission.AiReview,
    Permission.UsersManage,
    Permission.SettingsRead,
  ],
  editor: [
    Permission.DashboardView,
    Permission.ToolsRead,
    Permission.CategoriesRead,
    Permission.CrawlerRead,
    Permission.CrawlerRun,
    Permission.AiRead,
  ],
};
