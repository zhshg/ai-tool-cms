import {
  FolderTree,
  LayoutDashboard,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Tools",
    href: "/tools",
    icon: Wrench,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const breadcrumbLabels: Record<string, string> = {
  "": "Dashboard",
  tools: "Tools",
  categories: "Categories",
  users: "Users",
  settings: "Settings",
};
