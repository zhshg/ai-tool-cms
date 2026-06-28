"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Permission, RolePermissions, type PermissionCode } from "@/lib/permissions";
import { filterByPermission, hasAnyPermission, hasPermission, type AuthUser } from "@/lib/rbac";
import { navItems, type NavItem } from "@/lib/nav";
import { clientEnv } from "@ai-tool-cms/config/client";

type AuthContextValue = {
  user: AuthUser;
  hasPermission: (permission: PermissionCode) => boolean;
  hasAnyPermission: (permissions: PermissionCode[]) => boolean;
  navItems: NavItem[];
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveMockUser(): AuthUser {
  const role = clientEnv.NEXT_PUBLIC_ADMIN_MOCK_ROLE;
  const permissions = RolePermissions[role] ?? RolePermissions.admin;

  return {
    id: "mock-user",
    name: role === "editor" ? "Editor User" : "Admin User",
    email: role === "editor" ? "editor@example.com" : "admin@example.com",
    roles: [role],
    permissions,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const user = resolveMockUser();

    return {
      user,
      hasPermission: (permission) => hasPermission(user, permission),
      hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
      navItems: filterByPermission(navItems, user),
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function usePermissions() {
  const { hasPermission, hasAnyPermission, user } = useAuth();

  return {
    user,
    canViewDashboard: hasPermission(Permission.DashboardView),
    canReadTools: hasPermission(Permission.ToolsRead),
    canReadCategories: hasPermission(Permission.CategoriesRead),
    canManageUsers: hasPermission(Permission.UsersManage),
    canReadSettings: hasPermission(Permission.SettingsRead),
    canReadCrawler: hasPermission(Permission.CrawlerRead),
    canManageCrawler: hasPermission(Permission.CrawlerManage),
    canRunCrawler: hasPermission(Permission.CrawlerRun),
    hasPermission,
    hasAnyPermission,
  };
}
