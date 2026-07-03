"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  FolderTree,
  HardDriveDownload,
  Search,
  Settings2,
  Users,
  Wrench,
} from "lucide-react";
import { usePermissions } from "@/components/rbac/auth-provider";
import { fetchDashboardStats, type ApiError, type DashboardStatsResponse } from "@/lib/api";

const stats = [
  { key: "totalTools", label: "Total Tools", icon: Wrench },
  { key: "publishedTools", label: "Published Tools", icon: Wrench },
  { key: "draftTools", label: "Draft Tools", icon: Wrench },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "users", label: "Total Users", icon: Users },
  { key: "activeUsers", label: "Active Users", icon: Users },
  { key: "pendingAiReview", label: "Pending AI Reviews", icon: Bot },
  { key: "crawlerJobs", label: "Crawler Jobs", icon: Activity },
  { key: "workerQueue", label: "Worker Queue", icon: HardDriveDownload },
] as const;

function getStatValue(
  statsData: DashboardStatsResponse | null,
  key: (typeof stats)[number]["key"],
) {
  if (!statsData) return "0";
  return String(statsData[key] ?? 0);
}

export function DashboardSummary() {
  const { user } = usePermissions();
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
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
              {stat.key === "crawlerJobs" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last crawl{" "}
                  {statsData?.lastCrawl ? new Date(statsData.lastCrawl).toLocaleString() : "0"}
                </p>
              ) : null}
              {stat.key === "workerQueue" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Scheduler jobs {statsData?.schedulerJobs ?? 0}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Indexed Tools</p>
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{statsData?.indexedTools ?? 0}</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Search Index</p>
            <HardDriveDownload className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{statsData?.searchIndex ?? 0}</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">System Health</p>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{statsData?.systemHealth?.status ?? "0"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            DB {statsData?.systemHealth?.database ? "OK" : "0"} | Redis{" "}
            {statsData?.systemHealth?.redis ? "OK" : "0"}
          </p>
        </div>
      </div>

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
