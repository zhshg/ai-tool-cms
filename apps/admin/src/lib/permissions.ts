export const Permission = {
  DashboardView: "dashboard:view",
  ToolsRead: "tools:read",
  ToolsCreate: "tools:create",
  ToolsUpdate: "tools:update",
  ToolsDelete: "tools:delete",
  CategoriesRead: "categories:read",
  CategoriesCreate: "categories:create",
  CategoriesUpdate: "categories:update",
  CategoriesDelete: "categories:delete",
  UsersManage: "users:manage",
  SettingsRead: "settings:read",
  CrawlerRead: "crawler:read",
  CrawlerManage: "crawler:manage",
  CrawlerRun: "crawler:run",
  AiRead: "ai:read",
  AiManage: "ai:manage",
  AiReview: "ai:review",
  SeoRead: "seo:read",
  SeoManage: "seo:manage",
  SearchRead: "search:read",
  AnalyticsRead: "analytics:read",
  MonetizationRead: "monetization:read",
  MonetizationManage: "monetization:manage",
  PlatformRead: "platform:read",
  PlatformManage: "platform:manage",
  RevenueRead: "revenue:read",
  PartnerRead: "partner:read",
  GrowthRead: "growth:read",
  I18nRead: "i18n:read",
  I18nManage: "i18n:manage",
  GlobalRead: "global:read",
  AutomationRead: "automation:read",
  AutomationManage: "automation:manage",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

const permissionAliases: Record<string, PermissionCode> = {
  "tool:read": Permission.ToolsRead,
  "tool:create": Permission.ToolsCreate,
  "tool:update": Permission.ToolsUpdate,
  "tool:delete": Permission.ToolsDelete,
  "category:read": Permission.CategoriesRead,
  "category:create": Permission.CategoriesCreate,
  "category:update": Permission.CategoriesUpdate,
  "category:delete": Permission.CategoriesDelete,
};

export function normalizePermissionCode(permission: string): PermissionCode | null {
  if (Object.values(Permission).includes(permission as PermissionCode)) {
    return permission as PermissionCode;
  }

  return permissionAliases[permission] ?? null;
}

export const RolePermissions: Record<string, PermissionCode[]> = {
  admin: [
    Permission.DashboardView,
    Permission.ToolsRead,
    Permission.ToolsCreate,
    Permission.ToolsUpdate,
    Permission.ToolsDelete,
    Permission.CategoriesRead,
    Permission.CategoriesCreate,
    Permission.CategoriesUpdate,
    Permission.CategoriesDelete,
    Permission.CrawlerRead,
    Permission.CrawlerManage,
    Permission.CrawlerRun,
    Permission.AiRead,
    Permission.AiManage,
    Permission.AiReview,
    Permission.SeoRead,
    Permission.SeoManage,
    Permission.SearchRead,
    Permission.AnalyticsRead,
    Permission.MonetizationRead,
    Permission.MonetizationManage,
    Permission.PlatformRead,
    Permission.PlatformManage,
    Permission.RevenueRead,
    Permission.PartnerRead,
    Permission.GrowthRead,
    Permission.I18nRead,
    Permission.I18nManage,
    Permission.GlobalRead,
    Permission.AutomationRead,
    Permission.AutomationManage,
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
    Permission.SearchRead,
    Permission.AnalyticsRead,
  ],
};
