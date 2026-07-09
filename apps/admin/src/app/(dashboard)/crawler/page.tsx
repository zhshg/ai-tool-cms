"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Layers,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/rbac/auth-provider";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Button } from "@/components/ui/button";
import {
  fetchCrawlSources,
  fetchCrawlerDashboard,
  type ApiError,
  type CrawlSource,
  type CrawlerDashboard,
  triggerCrawlerJob,
} from "@/lib/api";
import { getCrawlerRunActionState } from "@/lib/crawler";
import { Permission } from "@/lib/permissions";

const metricConfig = [
  { key: "todayCrawl", label: "Today crawl", icon: Activity },
  { key: "success", label: "Succeeded", icon: CheckCircle2 },
  { key: "failed", label: "Failed", icon: XCircle },
  { key: "pending", label: "Pending", icon: Clock3 },
  { key: "queueTotal", label: "Queue jobs", icon: Layers },
  { key: "averageTimeMs", label: "Average time ms", icon: RefreshCw },
  { key: "newTools", label: "New tools", icon: PlusCircle },
  { key: "updatedTools", label: "Updated tools", icon: RefreshCw },
] as const;

function resolveMetric(data: CrawlerDashboard | null, key: (typeof metricConfig)[number]["key"]) {
  if (!data) return 0;
  if (key === "queueTotal") return data.queue.total;
  return data[key];
}

export default function CrawlerPage() {
  const { hasPermission } = useAuth();
  const [dashboard, setDashboard] = useState<CrawlerDashboard | null>(null);
  const [sources, setSources] = useState<CrawlSource[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const canRunCrawler = hasPermission(Permission.CrawlerRun);

  const loadCrawlerPage = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [dashboardData, sourceData] = await Promise.all([
        fetchCrawlerDashboard(),
        fetchCrawlSources(),
      ]);
      setDashboard(dashboardData);
      setSources(sourceData.items);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCrawlerPage();
  }, [loadCrawlerPage]);

  async function handleRefresh() {
    setMessage(null);
    await loadCrawlerPage();
  }

  async function handleTriggerSource(source: CrawlSource) {
    if (!canRunCrawler) {
      return;
    }

    setError(null);
    setMessage(null);
    setActiveSourceId(source.id);

    try {
      const job = await triggerCrawlerJob(source.id);
      setMessage(`Queued manual crawl for ${source.name}. Job ID: ${job.id}`);
      await loadCrawlerPage({ silent: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setActiveSourceId(null);
    }
  }

  return (
    <RequirePermission permission={Permission.CrawlerRead}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageHeader
            title="Crawler"
            description="Monitor crawl sources, queues, and daily ingestion health."
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            API error {error.status}: {error.message}
          </div>
        ) : null}

        {message ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricConfig.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.key}
                className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {isLoading ? "-" : resolveMetric(dashboard, metric.key)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Crawl sources</h2>
          </div>
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading crawler data...</p>
          ) : null}
          {!isLoading && !error && sources.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No crawl sources found.</p>
          ) : null}
          {!isLoading && !error && sources.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Adapter</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Next run</th>
                  {canRunCrawler ? <th className="px-4 py-3 font-medium">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const runAction = getCrawlerRunActionState(source, {
                    activeSourceId,
                    canRun: canRunCrawler,
                  });

                  return (
                    <tr key={source.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{source.name}</p>
                        <p className="text-muted-foreground">{source.baseUrl}</p>
                      </td>
                      <td className="px-4 py-3">{source.adapterType}</td>
                      <td className="px-4 py-3">{source.status}</td>
                      <td className="px-4 py-3">{source.schedule}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {source.nextRunAt ? new Date(source.nextRunAt).toLocaleString() : "None"}
                      </td>
                      {canRunCrawler ? (
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={runAction.disabled}
                            onClick={() => void handleTriggerSource(source)}
                          >
                            {runAction.label}
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </RequirePermission>
  );
}
