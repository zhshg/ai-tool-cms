import {
  Activity,
  BarChart3,
  Bot,
  BookOpen,
  Cog,
  DollarSign,
  Earth,
  FileWarning,
  FolderTree,
  Handshake,
  Languages,
  Layers3,
  LayoutDashboard,
  Network,
  Radar,
  Search,
  Settings,
  Sparkles,
  Target,
  UploadCloud,
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
    title: "Blog",
    href: "/blog",
    icon: BookOpen,
    permission: Permission.SeoRead,
  },
  {
    title: "Content Dataset",
    href: "/content",
    icon: FileWarning,
    permission: Permission.ToolsRead,
  },
  {
    title: "Collections",
    href: "/collections",
    icon: Layers3,
    permission: Permission.SeoRead,
  },
  {
    title: "Import Center",
    href: "/import",
    icon: UploadCloud,
    permission: Permission.ToolsCreate,
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
    icon: Radar,
    permission: Permission.AnalyticsRead,
  },
  {
    title: "Monetization",
    href: "/monetization",
    icon: Target,
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
    title: "Global",
    href: "/global",
    icon: Earth,
    permission: Permission.GlobalRead,
  },
  {
    title: "Localization",
    href: "/localization",
    icon: Languages,
    permission: Permission.I18nRead,
  },
  {
    title: "Platform",
    href: "/platform",
    icon: Network,
    permission: Permission.PlatformRead,
  },
  {
    title: "Partners",
    href: "/partners",
    icon: Handshake,
    permission: Permission.PartnerRead,
  },
  {
    title: "Automation",
    href: "/automation",
    icon: Cog,
    permission: Permission.AutomationRead,
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
  blog: "Blog",
  content: "Content Dataset",
  collections: "Collections",
  import: "Import Center",
  crawler: "Crawler",
  "ai-review": "AI Review",
  seo: "SEO",
  search: "Search",
  analytics: "Analytics",
  monetization: "Monetization",
  revenue: "Revenue",
  growth: "Growth Center",
  global: "Global",
  localization: "Localization",
  automation: "Automation Center",
  "automation/logs": "运行日志",
  platform: "Platform",
  partners: "Partners",
  users: "Users",
  settings: "Settings",
};
