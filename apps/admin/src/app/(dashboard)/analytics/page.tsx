"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  LineChart,
  MousePointerClick,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  downloadAnalyticsCsv,
  fetchAnalyticsOverview,
  getApiErrorMessage,
  type AnalyticsOverviewResponse,
  type AnalyticsPeriod,
  type ApiError,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

const periods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("daily");
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchAnalyticsOverview(period)
      .then((overview) => {
        setData(overview);
        setError(null);
      })
      .catch((err) => setError(err as ApiError))
      .finally(() => setIsLoading(false));
  }, [period]);

  const metricCards = useMemo(() => {
    const metrics = data?.metrics;
    return [
      { label: "Visitors", value: metrics?.visitors ?? 0, icon: Users },
      { label: "Views", value: metrics?.views ?? 0, icon: BarChart3 },
      { label: "Clicks", value: metrics?.clicks ?? 0, icon: MousePointerClick },
      { label: "CTR", value: `${metrics?.ctr ?? 0}%`, icon: LineChart },
      { label: "Growth", value: `${metrics?.growth ?? 0}%`, icon: TrendingUp },
      { label: "Search Keywords", value: metrics?.searchQueries ?? 0, icon: Search },
    ];
  }, [data]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const csv = await downloadAnalyticsCsv(period);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-${period}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <RequirePermission permission={Permission.AnalyticsRead}>
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Track visitors, tools, categories, search intent, CTR, imports, crawler work, and growth."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border bg-card p-1">
            {periods.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`rounded px-3 py-1.5 text-sm ${period === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            onClick={() => void handleExport()}
            disabled={isExporting || !data}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            API error {error.status}: {getApiErrorMessage(error)}
          </div>
        ) : null}

        {isLoading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
              </div>
            );
          })}
        </div>

        {data ? (
          <>
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Traffic Trend</h2>
                <p className="text-xs text-muted-foreground">{data.note}</p>
              </div>
              <div className="mt-5 grid gap-2">
                {data.trends.map((trend) => {
                  const max = Math.max(
                    ...data.trends.map(
                      (item) => item.searches + item.clicks + item.views + item.crawlerJobs,
                    ),
                    1,
                  );
                  const total = trend.searches + trend.clicks + trend.views + trend.crawlerJobs;
                  return (
                    <div
                      key={trend.label}
                      className="grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-3 text-sm"
                    >
                      <span className="text-muted-foreground">{trend.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, (total / max) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right tabular-nums">{total}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
              <RankTable
                title="Top Tools"
                rows={data.topTools.map((tool) => ({
                  name: tool.name,
                  value: tool.clicks,
                  hint: tool.slug,
                }))}
                empty="No tool clicks yet."
              />
              <RankTable
                title="Top Categories"
                rows={data.topCategories.map((category) => ({
                  name: category.name,
                  value: category.toolCount,
                  hint: category.slug,
                }))}
                empty="No category data yet."
              />
              <RankTable
                title="Search Keywords"
                rows={data.searchKeywords.map((keyword) => ({
                  name: keyword.keyword,
                  value: keyword.searches,
                  hint: `${keyword.avgLatencyMs}ms avg`,
                }))}
                empty="No searches yet."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <RankTable
                title="Collections"
                rows={data.collections.map((collection) => ({
                  name: collection.name,
                  value: collection.toolCount,
                  hint: collection.slug,
                }))}
                empty="No public collections yet."
              />
              <RankTable
                title="Traffic Sources"
                rows={data.trafficSources.map((source) => ({
                  name: source.source,
                  value: source.visits,
                  hint: source.referrer,
                }))}
                empty="No tracked traffic sources yet."
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <StatsPanel
                title="Import Statistics"
                rows={[
                  ["Imported Tools", data.importStatistics.importedTools],
                  ["New Tools", data.importStatistics.newTools],
                  ["Published Tools", data.importStatistics.publishedTools],
                ]}
              />
              <StatsPanel
                title="Crawler Statistics"
                rows={[
                  ["Total Jobs", data.crawlerStatistics.total],
                  ["Success", data.crawlerStatistics.success],
                  ["Failed", data.crawlerStatistics.failed],
                  ["Pending", data.crawlerStatistics.pending],
                ]}
              />
            </div>
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}

function RankTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ name: string; value: number; hint: string }>;
  empty: string;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.name}-${row.hint}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.hint}</p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                {row.value}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </section>
  );
}

function StatsPanel({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
