"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, Globe, Link2, Map, RefreshCw, Search, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Button } from "@/components/ui/button";
import {
  fetchSearchConsole,
  fetchSeoDashboard,
  type ApiError,
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
  if (!dashboard) return "—";
  if (field === "score") return String(dashboard.report.score);
  if (field === "indexed") return String(dashboard.report.indexStatus.indexed);
  return String(dashboard.report.metrics[field]);
}

export default function SeoDashboardPage() {
  const [dashboard, setDashboard] = useState<SeoDashboardResponse | null>(null);
  const [searchConsole, setSearchConsole] = useState<SearchConsoleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, sc] = await Promise.all([fetchSeoDashboard(), fetchSearchConsole()]);
      setDashboard(dash);
      setSearchConsole(sc);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        setError("需要 JWT 认证。请在 localStorage 设置 atcms_jwt，或通过登录流程获取 Token。");
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

  return (
    <RequirePermission permission={Permission.SeoRead}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageHeader
            title="SEO Dashboard"
            description="生产 SEO 监控：Search Console、Sitemap、IndexNow、404、Core Web Vitals 与每日健康报告。"
          />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastRefresh && (
          <p className="mb-4 text-xs text-muted-foreground">
            上次刷新：{new Date(lastRefresh).toLocaleString()} · 日报快照已写入 seoHealthSnapshot
          </p>
        )}

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
                  {loading ? "…" : getMetricValue(dashboard, metric.field)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Google Search Console
            </h2>
            {searchConsole?.google ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">状态</dt>
                  <dd>{searchConsole.google.configured ? "已配置" : "未配置"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">收录</dt>
                  <dd>{String(searchConsole.google.indexedPages ?? "—")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">点击</dt>
                  <dd>{String(searchConsole.google.clicks ?? "—")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">展示</dt>
                  <dd>{String(searchConsole.google.impressions ?? "—")}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" />
              Bing Webmaster
            </h2>
            {searchConsole?.bing ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">状态</dt>
                  <dd>{searchConsole.bing.configured ? "已配置" : "未配置"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">收录</dt>
                  <dd>{String(searchConsole.bing.indexedPages ?? "—")}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Sitemap & IndexNow</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>/sitemap.xml → index</li>
              {(dashboard?.sitemapChunks ?? ["tool", "category", "tag", "compare"]).map((chunk) => (
                <li key={chunk}>/sitemaps/{chunk}.xml</li>
              ))}
            </ul>
            <code className="mt-3 block text-xs">POST /v1/seo/sitemap/ping</code>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Core Web Vitals
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              配置 GA4 / PageSpeed API 后接入 RUM。当前通过 Lighthouse CI 在部署流水线验证 LCP &lt;
              2.5s。
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-medium">每日报告 · 问题列表</h2>
            {dashboard?.report.issues.length ? (
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                {dashboard.report.issues.slice(0, 10).map((issue, i) => (
                  <li key={`${issue.code}-${i}`} className="flex gap-2">
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
                    {issue.path && (
                      <code className="text-xs text-muted-foreground">{issue.path}</code>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {loading ? "加载中…" : "无问题或尚未连接 API"}
              </p>
            )}
            {dashboard?.lastSnapshot && (
              <p className="mt-3 text-xs text-muted-foreground">
                上次快照：分数 {dashboard.lastSnapshot.score} ·{" "}
                {new Date(dashboard.lastSnapshot.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
