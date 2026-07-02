"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { filterByPermission, hasAnyPermission, hasPermission, type AuthUser } from "@/lib/rbac";
import { navItems, type NavItem } from "@/lib/nav";
import type { PermissionCode } from "@/lib/permissions";
import { RolePermissions } from "@/lib/permissions";
import { clearAdminTokens, getApiBase, redirectToAdminLogin, type ApiError } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: PermissionCode) => boolean;
  hasAnyPermission: (permissions: PermissionCode[]) => boolean;
  navItems: NavItem[];
  error: string | null;
};

type AuthProfile = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
};

const ACCESS_TOKEN_KEY = "atcms_jwt";
const REFRESH_TOKEN_KEY = "atcms_refresh_token";
const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(profile: AuthProfile): AuthUser {
  const fallbackRole = profile.roles[0] ?? "admin";
  const fallbackPermissions = RolePermissions[fallbackRole] ?? RolePermissions.admin;

  return {
    id: profile.id,
    name: profile.displayName || profile.email,
    email: profile.email,
    roles: profile.roles.length ? profile.roles : [fallbackRole],
    permissions: profile.permissions.length
      ? (profile.permissions as PermissionCode[])
      : fallbackPermissions,
  };
}

async function fetchAuthProfile(token: string): Promise<AuthUser> {
  const response = await fetch(`${getApiBase()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw {
      status: response.status,
      message: body || response.statusText,
    } satisfies ApiError;
  }

  const profile = (await response.json()) as AuthProfile;
  return normalizeUser(profile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearAdminTokens();
    setUser(null);
    setError(null);
  }, []);

  const hydrateUser = useCallback(async () => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const nextUser = await fetchAuthProfile(token);
      setUser(nextUser);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 401) {
        logout();
        redirectToAdminLogin();
      } else {
        setError(apiError.message || "Failed to load admin profile.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void hydrateUser();
  }, [hydrateUser]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBase()}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw {
          status: response.status,
          message: body || response.statusText,
        } satisfies ApiError;
      }

      const auth = (await response.json()) as LoginResponse;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
      }

      const nextUser = await fetchAuthProfile(auth.accessToken);
      setUser(nextUser);
    } catch (err) {
      const apiError = err as ApiError;
      clearAdminTokens();
      setUser(null);
      setError(apiError.message || "Sign in failed.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      hasPermission: (permission) => hasPermission(user, permission),
      hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
      navItems: filterByPermission(navItems, user),
      error,
    };
  }, [error, isLoading, login, logout, user]);

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
  const { hasPermission, hasAnyPermission, user, isAuthenticated, isLoading } = useAuth();

  return {
    user,
    isAuthenticated,
    isLoading,
    canViewDashboard: hasPermission("dashboard:view"),
    canReadTools: hasPermission("tools:read"),
    canReadCategories: hasPermission("categories:read"),
    canManageUsers: hasPermission("users:manage"),
    canReadSettings: hasPermission("settings:read"),
    canReadCrawler: hasPermission("crawler:read"),
    canManageCrawler: hasPermission("crawler:manage"),
    canRunCrawler: hasPermission("crawler:run"),
    hasPermission,
    hasAnyPermission,
  };
}
