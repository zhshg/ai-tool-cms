"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Layers,
  PlusCircle,
  RefreshCw,
  Settings2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/rbac/auth-provider";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createCrawlSource,
  fetchCrawlSources,
  fetchCrawlerDashboard,
  setCrawlSourceStatus,
  triggerCrawlerJob,
  updateCrawlSource,
  type ApiError,
  type CrawlSource,
  type CrawlerDashboard,
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

type SourceFormState = {
  name: string;
  slug: string;
  baseUrl: string;
  adapterType: string;
  status: "ENABLED" | "DISABLED" | "PAUSED";
  schedule: string;
  crawlIntervalMinutes: string;
  robotsTxt: string;
  priority: string;
  config: string;
  metadata: string;
};

const emptyForm: SourceFormState = {
  name: "",
  slug: "",
  baseUrl: "",
  adapterType: "",
  status: "ENABLED",
  schedule: "DAILY",
  crawlIntervalMinutes: "1440",
  robotsTxt: "",
  priority: "100",
  config: "{}",
  metadata: "{}",
};

function resolveMetric(data: CrawlerDashboard | null, key: (typeof metricConfig)[number]["key"]) {
  if (!data) return 0;
  if (key === "queueTotal") return data.queue.total;
  return data[key];
}

function parseJsonInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function formatJsonInput(value: unknown) {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

function formFromSource(source?: CrawlSource | null): SourceFormState {
  if (!source) return emptyForm;
  return {
    name: source.name ?? "",
    slug: source.slug ?? "",
    baseUrl: source.baseUrl ?? "",
    adapterType: source.adapterType ?? "",
    status: (source.status as SourceFormState["status"]) ?? "ENABLED",
    schedule: source.schedule ?? "DAILY",
    crawlIntervalMinutes: String(source.crawlIntervalMinutes ?? 1440),
    robotsTxt: source.robotsTxt ?? "",
    priority: String(source.priority ?? 100),
    config: formatJsonInput(source.config ?? {}),
    metadata: formatJsonInput(source.metadata ?? {}),
  };
}

function toInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export default function CrawlerPage() {
  const { hasPermission } = useAuth();
  const [dashboard, setDashboard] = useState<CrawlerDashboard | null>(null);
  const [sources, setSources] = useState<CrawlSource[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<CrawlSource | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<SourceFormState>(emptyForm);

  const canRunCrawler = hasPermission(Permission.CrawlerRun);
  const canManageCrawler = hasPermission(Permission.CrawlerManage);

  const title = useMemo(
    () => (editingSource ? `Edit source: ${editingSource.name}` : "Create crawl source"),
    [editingSource],
  );

  const loadCrawlerPage = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setIsLoading(true);

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
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCrawlerPage();
  }, [loadCrawlerPage]);

  function openCreateSheet() {
    setEditingSource(null);
    setForm(formFromSource(null));
    setFormError(null);
    setSheetOpen(true);
  }

  function openEditSheet(source: CrawlSource) {
    setEditingSource(source);
    setForm(formFromSource(source));
    setFormError(null);
    setSheetOpen(true);
  }

  function setField<K extends keyof SourceFormState>(key: K, value: SourceFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleRefresh() {
    setMessage(null);
    await loadCrawlerPage();
  }

  async function handleTriggerSource(source: CrawlSource) {
    if (!canRunCrawler) return;

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

  async function handleToggleStatus(source: CrawlSource) {
    if (!canManageCrawler) return;

    const nextStatus =
      source.status === "ENABLED" ? "PAUSED" : source.status === "PAUSED" ? "ENABLED" : "ENABLED";
    setActiveSourceId(source.id);
    setError(null);
    setMessage(null);

    try {
      await setCrawlSourceStatus(source.id, nextStatus);
      setMessage(`Source "${source.name}" updated to ${nextStatus}.`);
      await loadCrawlerPage({ silent: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setActiveSourceId(null);
    }
  }

  async function handleSaveSource() {
    if (!canManageCrawler) return;

    setSaving(true);
    setFormError(null);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        baseUrl: form.baseUrl.trim(),
        adapterType: form.adapterType.trim(),
        status: form.status,
        schedule: form.schedule,
        crawlIntervalMinutes: toInt(form.crawlIntervalMinutes),
        robotsTxt: form.robotsTxt.trim() || undefined,
        priority: toInt(form.priority),
        config: parseJsonInput(form.config),
        metadata: parseJsonInput(form.metadata),
      };

      if (!payload.name || !payload.baseUrl || !payload.adapterType) {
        setFormError("Name, Base URL, and Adapter Type are required.");
        return;
      }

      if (!Number.isInteger(payload.crawlIntervalMinutes) || payload.crawlIntervalMinutes < 5) {
        setFormError("Crawl interval must be an integer >= 5.");
        return;
      }

      if (!Number.isInteger(payload.priority) || payload.priority < 1) {
        setFormError("Priority must be an integer >= 1.");
        return;
      }

      if (editingSource) {
        await updateCrawlSource(editingSource.id, payload);
      } else {
        await createCrawlSource(payload);
      }

      setSheetOpen(false);
      setMessage(`Source ${editingSource ? "updated" : "created"} successfully.`);
      await loadCrawlerPage({ silent: true });
    } catch (err) {
      if (err instanceof SyntaxError) {
        setFormError("Config and metadata must be valid JSON.");
      } else {
        setError(err as ApiError);
      }
    } finally {
      setSaving(false);
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
          <div className="flex gap-2">
            {canManageCrawler ? (
              <Button variant="outline" size="sm" onClick={openCreateSheet}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New source
              </Button>
            ) : null}
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
                  <th className="px-4 py-3 font-medium">Actions</th>
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
                      <td className="px-4 py-3">
                        <div>{source.schedule}</div>
                        <div className="text-xs text-muted-foreground">
                          {source.crawlIntervalMinutes} min
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {source.nextRunAt ? new Date(source.nextRunAt).toLocaleString() : "None"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canRunCrawler ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={runAction.disabled}
                              onClick={() => void handleTriggerSource(source)}
                            >
                              {runAction.label}
                            </Button>
                          ) : null}
                          {canManageCrawler ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditSheet(source)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={activeSourceId === source.id}
                                onClick={() => void handleToggleStatus(source)}
                              >
                                {source.status === "ENABLED"
                                  ? "Pause"
                                  : source.status === "PAUSED"
                                    ? "Enable"
                                    : "Enable"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="inline-flex"
                                onClick={() => openEditSheet(source)}
                              >
                                <Settings2 className="mr-2 h-4 w-4" />
                                Frequency
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Source records live in production storage. You can edit them here.
              </p>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {formError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} />
              <Field label="Slug" value={form.slug} onChange={(value) => setField("slug", value)} />
              <Field
                label="Base URL"
                value={form.baseUrl}
                onChange={(value) => setField("baseUrl", value)}
              />
              <Field
                label="Adapter Type"
                value={form.adapterType}
                onChange={(value) => setField("adapterType", value)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Status</span>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.status}
                    onChange={(event) =>
                      setField("status", event.target.value as SourceFormState["status"])
                    }
                  >
                    <option value="ENABLED">ENABLED</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Schedule</span>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.schedule}
                    onChange={(event) => setField("schedule", event.target.value)}
                  >
                    <option value="MANUAL">MANUAL</option>
                    <option value="HOURLY">HOURLY</option>
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Updating `Schedule` or `Crawl interval minutes` will refresh `nextRunAt`.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Crawl interval minutes"
                  type="number"
                  value={form.crawlIntervalMinutes}
                  onChange={(value) => setField("crawlIntervalMinutes", value)}
                />
                <Field
                  label="Priority"
                  type="number"
                  value={form.priority}
                  onChange={(value) => setField("priority", value)}
                />
              </div>

              <Field
                label="Robots TXT"
                value={form.robotsTxt}
                onChange={(value) => setField("robotsTxt", value)}
              />
              <Textarea
                label="Config JSON"
                value={form.config}
                onChange={(value) => setField("config", value)}
                rows={8}
              />
              <Textarea
                label="Metadata JSON"
                value={form.metadata}
                onChange={(value) => setField("metadata", value)}
                rows={8}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveSource()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </RequirePermission>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        className="w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        rows={rows}
        className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
