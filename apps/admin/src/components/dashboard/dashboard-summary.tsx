"use client";

import { useEffect, useState } from "react";
import { FolderTree, Users, Wrench } from "lucide-react";
import { usePermissions } from "@/components/rbac/auth-provider";
import { fetchDashboardStats, type ApiError, type DashboardStatsResponse } from "@/lib/api";

const stats = [
  {
    key: "toolsTotal",
    label: "Tools",
    icon: Wrench,
    visible: (p: ReturnType<typeof usePermissions>) => p.canReadTools,
  },
  {
    key: "categoriesTotal",
    label: "Categories",
    icon: FolderTree,
    visible: (p: ReturnType<typeof usePermissions>) => p.canReadCategories,
  },
  {
    key: "usersTotal",
    label: "Users",
    icon: Users,
    visible: (p: ReturnType<typeof usePermissions>) => p.canManageUsers,
  },
] as const;

function getStatValue(statsData: DashboardStatsResponse | null, key: (typeof stats)[number]["key"]) {
  if (!statsData) return "0";
  if (key === "toolsTotal") return String(statsData.tools.total ?? 0);
  if (key === "categoriesTotal") return String(statsData.categories.total ?? 0);
  return String(statsData.users.total ?? 0);
}

export function DashboardSummary() {
  const permissions = usePermissions();
  const visibleStats = stats.filter((stat) => stat.visible(permissions));
  const user = permissions.user;
  const [statsData, setStatsData] = useState<DashboardStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then((data) => {
        setStatsData(data);
        setError(null);
      })
      .catch((err: ApiError) => setError(err.message || "Failed to load dashboard stats."));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{getStatValue(statsData, stat.key)}</p>
              {stat.key === "toolsTotal" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Published {statsData?.tools.published ?? 0} · Draft {statsData?.tools.draft ?? 0}
                </p>
              ) : null}
              {stat.key === "usersTotal" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Active {statsData?.users.active ?? 0}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-sm font-medium">RBAC session</h2>
        {user ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">User</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{user.roles.join(", ")}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Permissions</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {user.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {permission}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No active admin session.</p>
        )}
      </div>
    </div>
  );
}
