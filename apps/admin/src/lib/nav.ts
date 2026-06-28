import {
  Activity,
  BarChart3,
  Bot,
  FolderTree,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { PermissionCode } from "./permissions";
import { Permission } from "./permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionCode;
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: Permission.DashboardView,
  },
  {
    title: "Tools",
    href: "/tools",
    icon: Wrench,
    permission: Permission.ToolsRead,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
    permission: Permission.CategoriesRead,
  },
  {
    title: "Crawler",
    href: "/crawler",
    icon: Activity,
    permission: Permission.CrawlerRead,
  },
  {
    title: "AI Review",
    href: "/ai-review",
    icon: Bot,
    permission: Permission.AiRead,
  },
  {
    title: "SEO",
    href: "/seo",
    icon: BarChart3,
    permission: Permission.SeoRead,
  },
  {
    title: "Search",
    href: "/search",
    icon: Search,
    permission: Permission.SearchRead,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: Activity,
    permission: Permission.AnalyticsRead,
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    permission: Permission.UsersManage,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: Permission.SettingsRead,
  },
];

export const breadcrumbLabels: Record<string, string> = {
  "": "Dashboard",
  tools: "Tools",
  categories: "Categories",
  crawler: "Crawler",
  "ai-review": "AI Review",
  seo: "SEO",
  search: "Search",
  analytics: "Analytics",
  users: "Users",
  settings: "Settings",
};
