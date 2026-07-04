"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Database,
  FolderTree,
  Gauge,
  HardDriveDownload,
  ImageOff,
  Link2Off,
  Search,
  Server,
  Settings2,
  UploadCloud,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePermissions } from "@/components/rbac/auth-provider";
import { fetchDashboardStats, type ApiError, type DashboardStatsResponse } from "@/lib/api";

const primaryStats = [
  { key: "totalTools", label: "Total Tools", icon: Wrench },
  { key: "publishedTools", label: "Published Tools", icon: Wrench },
  { key: "draftTools", label: "Draft Tools", icon: Wrench },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "users", label: "Total Users", icon: Users },
  { key: "activeUsers", label: "Active Users", icon: Users },
  { key: "pendingAiReview", label: "Pending AI Reviews", icon: Bot },
  { key: "crawlerJobs", label: "Crawler Jobs", icon: Activity },
] as const;

const operationsStats = [
  { key: "contentScore", label: "Content Score", icon: Gauge, suffix: "%" },
  { key: "seoScore", label: "SEO Score", icon: Search, suffix: "%" },
  { key: "brokenLinks", label: "Broken Links", icon: Link2Off },
  { key: "missingLogos", label: "Missing Logos", icon: ImageOff },
  { key: "importQueue", label: "Import Queue", icon: UploadCloud },
  { key: "aiQueue", label: "AI Queue", icon: Bot },
  { key: "workerQueue", label: "Worker Queue", icon: HardDriveDownload },
  { key: "searchIndex", label: "Search Index", icon: Search },
] as const;

type StatKey = (typeof primaryStats)[number]["key"] | (typeof operationsStats)[number]["key"];

function getStatSuffix(stat: (typeof operationsStats)[number]) {
  return "suffix" in stat ? stat.suffix : "";
}
function getStatValue(statsData: DashboardStatsResponse | null, key: StatKey, suffix = "") {
  if (!statsData) return `0${suffix}`;
  return `${statsData[key] ?? 0}${suffix}`;
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
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primaryStats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={getStatValue(statsData, stat.key)}
            icon={stat.icon}
            detail={stat.key === "crawlerJobs" ? formatLastCrawl(statsData?.lastCrawl) : undefined}
          />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationsStats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={getStatValue(statsData, stat.key, getStatSuffix(stat))}
            icon={stat.icon}
          />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Content Operations" icon={Gauge}>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusRow label="Launch-ready tools" value={statsData?.content.launchReadyTools ?? 0} />
            <StatusRow label="Needs content work" value={statsData?.content.needsWork ?? 0} />
            <StatusRow label="Missing descriptions" value={statsData?.content.missingDescriptions ?? 0} />
            <StatusRow label="Missing features" value={statsData?.content.missingFeatures ?? 0} />
            <StatusRow label="Missing FAQ" value={statsData?.content.missingFaq ?? 0} />
            <StatusRow label="Missing screenshots" value={statsData?.content.missingScreenshots ?? 0} />
          </div>
        </Panel>

        <Panel title="SEO & Search" icon={Search}>
          <div className="space-y-3">
            <StatusRow label="Indexed tools" value={statsData?.seo.indexedTools ?? 0} />
            <StatusRow label="Missing metadata" value={statsData?.seo.missingMetadata ?? 0} />
            <StatusRow label="Weekly searches" value={statsData?.search.weeklyQueries ?? 0} />
            <StatusRow label="Weekly clicks" value={statsData?.search.weeklyClicks ?? 0} />
            <StatusRow label="Search status" value={statsData?.search.status ?? "unknown"} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Queues" icon={HardDriveDownload}>
          <div className="space-y-3">
            <StatusRow label="Crawler status" value={statsData?.crawler.crawlerStatus ?? "unknown"} />
            <StatusRow label="Worker status" value={statsData?.worker.status ?? "unknown"} />
            <StatusRow label="Failed jobs" value={statsData?.worker.failedJobs ?? 0} />
            <StatusRow label="Scheduler jobs" value={statsData?.schedulerJobs ?? 0} />
            <StatusRow label="Recent imports" value={statsData?.import.recentRuns ?? 0} />
          </div>
        </Panel>

        <Panel title="Infrastructure" icon={Server}>
          <div className="space-y-3">
            <StatusRow label="Database" value={statsData?.infrastructure.database ?? "unknown"} />
            <StatusRow label="Redis" value={statsData?.infrastructure.redis ?? "unknown"} />
            <StatusRow label="Storage" value={statsData?.infrastructure.storage ?? "unknown"} />
            <StatusRow label="Search index" value={statsData?.infrastructure.searchIndex ?? "unknown"} />
            <StatusRow label="System health" value={statsData?.systemHealth.status ?? "unknown"} />
          </div>
        </Panel>

        <Panel title="Database" icon={Database}>
          <div className="space-y-3">
            <StatusRow label="Tools" value={statsData?.totalTools ?? 0} />
            <StatusRow label="Categories" value={statsData?.categories ?? 0} />
            <StatusRow label="Tags" value={statsData?.tags ?? 0} />
            <StatusRow label="Users" value={statsData?.users ?? 0} />
            <StatusRow label="DB probe" value={statsData?.database ? "healthy" : "unknown"} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Recent Activity" icon={Activity}>
          {statsData?.recentActivity.length ? (
            <div className="space-y-3">
              {statsData.recentActivity.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href ?? "/"}
                  className="flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-2 text-sm transition hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.type}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    <span className="block">{item.status}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text="No recent activity yet." />
          )}
        </Panel>

        <Panel title="RBAC Session" icon={Settings2}>
          {user ? (
            <dl className="space-y-3 text-sm">
              <StatusRow label="User" value={user.name} />
              <StatusRow label="Role" value={user.roles.join(", ") || "none"} />
              <div>
                <dt className="text-muted-foreground">Permissions</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
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
            <EmptyState text="No active admin session." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{text}</div>;
}

function formatLastCrawl(value: string | null | undefined) {
  return value ? `Last crawl ${new Date(value).toLocaleString()}` : "Last crawl 0";
}
