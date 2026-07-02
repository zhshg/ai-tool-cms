"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Globe,
  Link2,
  Map,
  RefreshCw,
  Save,
  Search,
  Unplug,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Button } from "@/components/ui/button";
import {
  disconnectSeoIntegration,
  fetchSearchConsole,
  fetchSeoDashboard,
  fetchSeoIntegrations,
  refreshSeoIntegration,
  updateSeoIntegrations,
  type ApiError,
  type SeoGeneralConfig,
  type SeoIntegrationSnapshot,
  type SeoIntegrationsResponse,
  type SeoProviderConfig,
  type SearchConsoleResponse,
  type SeoDashboardResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

const metricDefs = [
  { key: "seoScore", label: "SEO Score", icon: BarChart3, field: "score" as const },
  { key: "indexed", label: "Indexed", icon: Search, field: "indexed" as const },
  { key: "notFound404", label: "404", icon: Globe, field: "notFound404" as const },
  { key: "brokenLinks", label: "Broken Links", icon: Link2, field: "brokenLinks" as const },
  {
    key: "duplicateTitles",
    label: "Duplicate Titles",
    icon: RefreshCw,
    field: "duplicateTitles" as const,
  },
  { key: "missingMeta", label: "Missing Meta", icon: Search, field: "missingMeta" as const },
  { key: "missingSchema", label: "Missing Schema", icon: Map, field: "missingSchema" as const },
  {
    key: "aiQualityLow",
    label: "AI Quality Low",
    icon: BarChart3,
    field: "aiQualityLow" as const,
  },
] as const;

function getMetricValue(
  dashboard: SeoDashboardResponse | null,
  field: (typeof metricDefs)[number]["field"],
): string {
  if (!dashboard) return "--";
  if (field === "score") return String(dashboard.report.score);
  if (field === "indexed") return String(dashboard.report.indexStatus.indexed);
  return String(dashboard.report.metrics[field]);
}

function createDefaultProviderConfig(): SeoProviderConfig {
  return {
    enabled: false,
    siteUrl: "",
    propertyId: "",
    propertyName: "",
    oauthAccessToken: "",
    oauthRefreshToken: "",
    apiKey: "",
    verificationStatus: "not_connected",
  };
}

function createDefaultGeneralConfig(): SeoGeneralConfig {
  return {
    robots: ["User-agent: *", "Allow: /", "Sitemap: /sitemap.xml"],
    sitemapEnabled: true,
    canonicalEnabled: true,
    openGraphEnabled: true,
    twitterEnabled: true,
    indexNowEnabled: false,
    indexNowKey: "",
    analyticsProvider: "ga4",
    ga4MeasurementId: "",
    ga4ApiSecret: "",
  };
}

function formatNumber(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return "0";
}

function formatPercent(value: unknown): string {
  if (typeof value === "number") {
    return `${value}%`;
  }
  return "0%";
}

function normalizeSnapshot(
  fallback: Record<string, unknown> | undefined,
  preferred?: SeoIntegrationSnapshot,
): SeoIntegrationSnapshot {
  if (preferred) {
    return preferred;
  }

  return {
    provider: String(fallback?.provider ?? "unknown"),
    configured: Boolean(fallback?.configured),
    verificationStatus:
      typeof fallback?.verificationStatus === "string" ? fallback.verificationStatus : null,
    propertyId: typeof fallback?.propertyId === "string" ? fallback.propertyId : null,
    propertyName: typeof fallback?.propertyName === "string" ? fallback.propertyName : null,
    siteUrl: typeof fallback?.siteUrl === "string" ? fallback.siteUrl : null,
    clicks: typeof fallback?.clicks === "number" ? fallback.clicks : 0,
    impressions: typeof fallback?.impressions === "number" ? fallback.impressions : 0,
    ctr: typeof fallback?.ctr === "number" ? fallback.ctr : 0,
    averagePosition: typeof fallback?.averagePosition === "number" ? fallback.averagePosition : 0,
    indexedPages: typeof fallback?.indexedPages === "number" ? fallback.indexedPages : 0,
    coverage: typeof fallback?.coverage === "number" ? fallback.coverage : 0,
    sitemaps: typeof fallback?.sitemaps === "number" ? fallback.sitemaps : 0,
    keywords: typeof fallback?.keywords === "number" ? fallback.keywords : 0,
    indexStatus: typeof fallback?.indexStatus === "number" ? fallback.indexStatus : 0,
    crawlErrors: typeof fallback?.crawlErrors === "number" ? fallback.crawlErrors : 0,
    lastSyncedAt: typeof fallback?.lastSyncedAt === "string" ? fallback.lastSyncedAt : null,
    note: typeof fallback?.message === "string" ? fallback.message : undefined,
  };
}

function IntegrationCard({
  title,
  provider,
  config,
  live,
  onChange,
  onRefresh,
  onDisconnect,
  busy,
}: {
  title: string;
  provider: "google" | "bing";
  config: SeoProviderConfig;
  live: SeoIntegrationSnapshot;
  onChange: (next: SeoProviderConfig) => void;
  onRefresh: (provider: "google" | "bing") => void;
  onDisconnect: (provider: "google" | "bing") => void;
  busy: boolean;
}) {
  const metrics =
    provider === "google"
      ? [
          { label: "Clicks", value: formatNumber(live.clicks) },
          { label: "Impressions", value: formatNumber(live.impressions) },
          { label: "CTR", value: formatPercent(live.ctr) },
          { label: "Average Position", value: formatNumber(live.averagePosition) },
          { label: "Indexed Pages", value: formatNumber(live.indexedPages) },
          { label: "Coverage", value: formatNumber(live.coverage) },
          { label: "Sitemaps", value: formatNumber(live.sitemaps) },
        ]
      : [
          { label: "Clicks", value: formatNumber(live.clicks) },
          { label: "Impressions", value: formatNumber(live.impressions) },
          { label: "Keywords", value: formatNumber(live.keywords) },
          { label: "Index Status", value: formatNumber(live.indexStatus) },
          { label: "Crawl Errors", value: formatNumber(live.crawlErrors) },
        ];

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.enabled ? "Connected" : "Disconnected"} · Verification:{" "}
            {live.verificationStatus ?? config.verificationStatus ?? "unknown"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onRefresh(provider)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onDisconnect(provider)}
          >
            <Unplug className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Site URL</span>
          <input
            className="w-full rounded-md border bg-background px-3 py-2"
            value={config.siteUrl}
            onChange={(event) => onChange({ ...config, enabled: true, siteUrl: event.target.value })}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">
            {provider === "google" ? "Property ID" : "API Key"}
          </span>
          <input
            className="w-full rounded-md border bg-background px-3 py-2"
            value={provider === "google" ? config.propertyId : config.apiKey ?? ""}
            onChange={(event) =>
              onChange(
                provider === "google"
                  ? { ...config, enabled: true, propertyId: event.target.value }
                  : { ...config, enabled: true, apiKey: event.target.value },
              )
            }
          />
        </label>

        {provider === "google" ? (
          <>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Property Name</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={config.propertyName}
                onChange={(event) =>
                  onChange({ ...config, enabled: true, propertyName: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">OAuth Access Token</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={config.oauthAccessToken ?? ""}
                onChange={(event) =>
                  onChange({ ...config, enabled: true, oauthAccessToken: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">OAuth Refresh Token</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={config.oauthRefreshToken ?? ""}
                onChange={(event) =>
                  onChange({ ...config, enabled: true, oauthRefreshToken: event.target.value })
                }
              />
            </label>
          </>
        ) : null}

        <label className={`space-y-2 text-sm ${provider === "google" ? "md:col-span-2" : ""}`}>
          <span className="font-medium">Verification Status</span>
          <input
            className="w-full rounded-md border bg-background px-3 py-2"
            value={config.verificationStatus}
            onChange={(event) =>
              onChange({ ...config, enabled: true, verificationStatus: event.target.value })
            }
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>

      {live.note ? <p className="mt-4 text-xs text-muted-foreground">{live.note}</p> : null}
    </div>
  );
}

export default function SeoDashboardPage() {
  const [dashboard, setDashboard] = useState<SeoDashboardResponse | null>(null);
  const [searchConsole, setSearchConsole] = useState<SearchConsoleResponse | null>(null);
  const [integrations, setIntegrations] = useState<SeoIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, sc, config] = await Promise.all([
        fetchSeoDashboard(),
        fetchSearchConsole(),
        fetchSeoIntegrations(),
      ]);
      setDashboard(dash);
      setSearchConsole(sc);
      setIntegrations(config);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        setError("需要登录后再访问 SEO 配置中心。");
      } else {
        setError(apiErr.message ?? "加载 SEO 数据失败");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const googleConfig = integrations?.providers.googleSearchConsole.config ?? createDefaultProviderConfig();
  const bingConfig = integrations?.providers.bingWebmaster.config ?? createDefaultProviderConfig();
  const generalConfig = integrations?.general ?? createDefaultGeneralConfig();

  const googleLive = useMemo(
    () =>
      normalizeSnapshot(
        searchConsole?.google,
        integrations?.providers.googleSearchConsole.live,
      ),
    [integrations?.providers.googleSearchConsole.live, searchConsole?.google],
  );

  const bingLive = useMemo(
    () =>
      normalizeSnapshot(searchConsole?.bing, integrations?.providers.bingWebmaster.live),
    [integrations?.providers.bingWebmaster.live, searchConsole?.bing],
  );

  const saveIntegrations = useCallback(async () => {
    if (!integrations) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const next = await updateSeoIntegrations({
        googleSearchConsole: integrations.providers.googleSearchConsole.config,
        bingWebmaster: integrations.providers.bingWebmaster.config,
        general: integrations.general,
      });
      setIntegrations(next);
      setMessage("SEO integrations saved.");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to save SEO integrations.");
    } finally {
      setSaving(false);
    }
  }, [integrations]);

  const handleRefreshProvider = useCallback(async (provider: "google" | "bing") => {
    setError(null);
    setMessage(null);
    try {
      const next = await refreshSeoIntegration(provider);
      setIntegrations(next);
      setMessage(`${provider === "google" ? "Google Search Console" : "Bing Webmaster"} refreshed.`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to refresh integration.");
    }
  }, []);

  const handleDisconnectProvider = useCallback(async (provider: "google" | "bing") => {
    setError(null);
    setMessage(null);
    try {
      const next = await disconnectSeoIntegration(provider);
      setIntegrations(next);
      setMessage(
        `${provider === "google" ? "Google Search Console" : "Bing Webmaster"} disconnected.`,
      );
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to disconnect integration.");
    }
  }, []);

  return (
    <RequirePermission permission={Permission.SeoRead}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageHeader
            title="SEO Dashboard"
            description="Turn SEO into a real operations console for Google Search Console, Bing Webmaster, robots, sitemap, canonical, OpenGraph, Twitter, IndexNow, and analytics."
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => void saveIntegrations()} disabled={loading || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {message ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {lastRefresh ? (
          <p className="mb-4 text-xs text-muted-foreground">
            Last refresh: {new Date(lastRefresh).toLocaleString()} · snapshot persisted to
            `seoHealthSnapshot`
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricDefs.map((metric) => {
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
                  {loading ? "--" : getMetricValue(dashboard, metric.field)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <IntegrationCard
            title="Google Search Console"
            provider="google"
            config={googleConfig}
            live={googleLive}
            busy={saving || loading}
            onChange={(next) =>
              setIntegrations((current) =>
                current
                  ? {
                      ...current,
                      providers: {
                        ...current.providers,
                        googleSearchConsole: {
                          ...current.providers.googleSearchConsole,
                          config: next,
                        },
                      },
                    }
                  : current,
              )
            }
            onRefresh={handleRefreshProvider}
            onDisconnect={handleDisconnectProvider}
          />

          <IntegrationCard
            title="Bing Webmaster"
            provider="bing"
            config={bingConfig}
            live={bingLive}
            busy={saving || loading}
            onChange={(next) =>
              setIntegrations((current) =>
                current
                  ? {
                      ...current,
                      providers: {
                        ...current.providers,
                        bingWebmaster: {
                          ...current.providers.bingWebmaster,
                          config: next,
                        },
                      },
                    }
                  : current,
              )
            }
            onRefresh={handleRefreshProvider}
            onDisconnect={handleDisconnectProvider}
          />

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">General SEO</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Persist robots, sitemap, canonical, social metadata, IndexNow, and analytics options.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                ["Sitemap", "sitemapEnabled"],
                ["Canonical", "canonicalEnabled"],
                ["OpenGraph", "openGraphEnabled"],
                ["Twitter", "twitterEnabled"],
                ["IndexNow", "indexNowEnabled"],
              ].map(([label, field]) => (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(generalConfig[field as keyof SeoGeneralConfig])}
                    onChange={(event) =>
                      setIntegrations((current) =>
                        current
                          ? {
                              ...current,
                              general: {
                                ...current.general,
                                [field]: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="font-medium">Robots</span>
              <textarea
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2"
                value={generalConfig.robots.join("\n")}
                onChange={(event) =>
                  setIntegrations((current) =>
                    current
                      ? {
                          ...current,
                          general: {
                            ...current.general,
                            robots: event.target.value.split("\n"),
                          },
                        }
                      : current,
                  )
                }
              />
            </label>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">IndexNow Key</span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={generalConfig.indexNowKey ?? ""}
                  onChange={(event) =>
                    setIntegrations((current) =>
                      current
                        ? {
                            ...current,
                            general: {
                              ...current.general,
                              indexNowKey: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Analytics Provider</span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={generalConfig.analyticsProvider}
                  onChange={(event) =>
                    setIntegrations((current) =>
                      current
                        ? {
                            ...current,
                            general: {
                              ...current.general,
                              analyticsProvider: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">GA4 Measurement ID</span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={generalConfig.ga4MeasurementId ?? ""}
                  onChange={(event) =>
                    setIntegrations((current) =>
                      current
                        ? {
                            ...current,
                            general: {
                              ...current.general,
                              ga4MeasurementId: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">GA4 API Secret</span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={generalConfig.ga4ApiSecret ?? ""}
                  onChange={(event) =>
                    setIntegrations((current) =>
                      current
                        ? {
                            ...current,
                            general: {
                              ...current.general,
                              ga4ApiSecret: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">Sitemap & IndexNow</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>/sitemap.xml -&gt; index</li>
              {(dashboard?.sitemapChunks ?? ["tool", "category", "tag", "compare"]).map((chunk) => (
                <li key={chunk}>/sitemaps/{chunk}.xml</li>
              ))}
            </ul>
            <code className="mt-3 block text-xs">POST /v1/seo/sitemap/ping</code>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Zap className="h-4 w-4" />
              Core Web Vitals
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              GA4 / PageSpeed API can be connected later. This batch focuses on persistent SEO
              integrations and an operations-grade configuration center.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold">Daily SEO Issues</h2>
            {dashboard?.report.issues.length ? (
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                {dashboard.report.issues.slice(0, 10).map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className="flex gap-2">
                    <span
                      className={
                        issue.severity === "error"
                          ? "text-destructive"
                          : issue.severity === "warning"
                            ? "text-amber-600"
                            : "text-muted-foreground"
                      }
                    >
                      [{issue.severity}]
                    </span>
                    <span>{issue.message}</span>
                    {issue.path ? (
                      <code className="text-xs text-muted-foreground">{issue.path}</code>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {loading ? "Loading..." : "No issues found or no external data source connected yet."}
              </p>
            )}

            {dashboard?.lastSnapshot ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last snapshot: score {dashboard.lastSnapshot.score} ·{" "}
                {new Date(dashboard.lastSnapshot.createdAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
