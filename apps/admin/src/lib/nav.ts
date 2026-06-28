import {
  Activity,
  BarChart3,
  Bot,
  DollarSign,
  FolderTree,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Search,
  Settings,
  Sparkles,
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
    title: "Monetization",
    href: "/monetization",
    icon: Megaphone,
    permission: Permission.MonetizationRead,
  },
  {
    title: "Revenue",
    href: "/revenue",
    icon: DollarSign,
    permission: Permission.RevenueRead,
  },
  {
    title: "Growth Center",
    href: "/growth",
    icon: Sparkles,
    permission: Permission.GrowthRead,
  },
  {
    title: "Platform",
    href: "/platform",
    icon: Handshake,
    permission: Permission.PlatformRead,
  },
  {
    title: "Partners",
    href: "/partners",
    icon: Handshake,
    permission: Permission.PartnerRead,
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
  monetization: "Monetization",
  revenue: "Revenue",
  growth: "Growth Center",
  platform: "Platform",
  partners: "Partners",
  users: "Users",
  settings: "Settings",
};
