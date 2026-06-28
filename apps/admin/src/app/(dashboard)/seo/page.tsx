"use client";

import { BarChart3, Globe, Link2, Map, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "seoScore", label: "SEO Score", icon: BarChart3 },
  { key: "indexed", label: "Index Status", icon: Search },
  { key: "notFound404", label: "404", icon: Globe },
  { key: "brokenLinks", label: "Broken Links", icon: Link2 },
  { key: "duplicateTitles", label: "Duplicate Titles", icon: RefreshCw },
  { key: "missingMeta", label: "Missing Meta", icon: Search },
  { key: "missingSchema", label: "Missing Schema", icon: Map },
  { key: "aiQualityLow", label: "AI Quality", icon: BarChart3 },
] as const;

export default function SeoDashboardPage() {
  return (
    <RequirePermission permission={Permission.SeoRead}>
      <div>
        <PageHeader
          title="SEO Dashboard"
          description="全站 SEO 健康度、Search Console、Sitemap 与内部链接一览（Commits 049–050）。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
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
                <p className="mt-3 text-3xl font-semibold">—</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Search Console（049）</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Google Search Console + Bing Webmaster API — 收录量、点击、排名、Sitemap 状态。
            </p>
            <code className="mt-3 block text-xs">GET /v1/seo/search-console</code>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Sitemap 分片（043）</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>/sitemap.xml → index</li>
              <li>/sitemaps/tool.xml</li>
              <li>/sitemaps/category.xml · tag · prompt · compare · rss</li>
            </ul>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Compare Engine（046）</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ChatGPT vs Claude、Best alternatives、Top lists — 自动生成高意图页面。
            </p>
            <code className="mt-2 block text-xs">POST /v1/seo/sync/compare-pages</code>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">内部链接（044）</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              每个 Tool 至少 20 条内链：Alternatives → Compare → Category → Tags → FAQ。
            </p>
            <code className="mt-2 block text-xs">POST /v1/seo/sync/internal-links</code>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
