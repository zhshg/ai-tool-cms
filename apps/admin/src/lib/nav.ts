import {
  FolderTree,
  LayoutDashboard,
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
  users: "Users",
  settings: "Settings",
};
