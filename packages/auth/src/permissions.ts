/** Canonical permission codes seeded in the database and used by API guards. */
export const PermissionCode = {
  DashboardView: "dashboard:view",
  ToolRead: "tool:read",
  ToolCreate: "tool:create",
  ToolUpdate: "tool:update",
  ToolDelete: "tool:delete",
  CategoryRead: "category:read",
  CategoryCreate: "category:create",
  CategoryUpdate: "category:update",
  CategoryDelete: "category:delete",
  TagRead: "tag:read",
  TagCreate: "tag:create",
  TagUpdate: "tag:update",
  TagDelete: "tag:delete",
  UsersManage: "users:manage",
  SettingsRead: "settings:read",
  CrawlerRead: "crawler:read",
  CrawlerManage: "crawler:manage",
  CrawlerRun: "crawler:run",
  AiRead: "ai:read",
  AiManage: "ai:manage",
  AiReview: "ai:review",
} as const;

export type PermissionCodeValue = (typeof PermissionCode)[keyof typeof PermissionCode];

export type PermissionDefinition = {
  code: PermissionCodeValue;
  slug: string;
  name: string;
  module: string;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    code: PermissionCode.DashboardView,
    slug: "dashboard-view",
    name: "View Dashboard",
    module: "dashboard",
  },
  {
    code: PermissionCode.ToolRead,
    slug: "tool-read",
    name: "Read Tools",
    module: "tool",
  },
  {
    code: PermissionCode.ToolCreate,
    slug: "tool-create",
    name: "Create Tools",
    module: "tool",
  },
  {
    code: PermissionCode.ToolUpdate,
    slug: "tool-update",
    name: "Update Tools",
    module: "tool",
  },
  {
    code: PermissionCode.ToolDelete,
    slug: "tool-delete",
    name: "Delete Tools",
    module: "tool",
  },
  {
    code: PermissionCode.CategoryRead,
    slug: "category-read",
    name: "Read Categories",
    module: "category",
  },
  {
    code: PermissionCode.CategoryCreate,
    slug: "category-create",
    name: "Create Categories",
    module: "category",
  },
  {
    code: PermissionCode.CategoryUpdate,
    slug: "category-update",
    name: "Update Categories",
    module: "category",
  },
  {
    code: PermissionCode.CategoryDelete,
    slug: "category-delete",
    name: "Delete Categories",
    module: "category",
  },
  {
    code: PermissionCode.TagRead,
    slug: "tag-read",
    name: "Read Tags",
    module: "tag",
  },
  {
    code: PermissionCode.TagCreate,
    slug: "tag-create",
    name: "Create Tags",
    module: "tag",
  },
  {
    code: PermissionCode.TagUpdate,
    slug: "tag-update",
    name: "Update Tags",
    module: "tag",
  },
  {
    code: PermissionCode.TagDelete,
    slug: "tag-delete",
    name: "Delete Tags",
    module: "tag",
  },
  {
    code: PermissionCode.UsersManage,
    slug: "users-manage",
    name: "Manage Users",
    module: "users",
  },
  {
    code: PermissionCode.SettingsRead,
    slug: "settings-read",
    name: "Read Settings",
    module: "settings",
  },
  {
    code: PermissionCode.CrawlerRead,
    slug: "crawler-read",
    name: "Read Crawler",
    module: "crawler",
  },
  {
    code: PermissionCode.CrawlerManage,
    slug: "crawler-manage",
    name: "Manage Crawler Sources",
    module: "crawler",
  },
  {
    code: PermissionCode.CrawlerRun,
    slug: "crawler-run",
    name: "Run Crawler Jobs",
    module: "crawler",
  },
  {
    code: PermissionCode.AiRead,
    slug: "ai-read",
    name: "Read AI Pipeline",
    module: "ai",
  },
  {
    code: PermissionCode.AiManage,
    slug: "ai-manage",
    name: "Manage AI Pipeline",
    module: "ai",
  },
  {
    code: PermissionCode.AiReview,
    slug: "ai-review",
    name: "Review AI Content",
    module: "ai",
  },
];

export const ADMIN_ROLE_CODE = "admin";
export const EDITOR_ROLE_CODE = "editor";
export const VIEWER_ROLE_CODE = "viewer";
