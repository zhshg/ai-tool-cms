"use client";

import { Search, TrendingUp, AlertTriangle, MousePointerClick, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const cards = [
  { key: "topQueries", label: "Top Queries", icon: Search },
  { key: "noResultQueries", label: "No Result Queries", icon: AlertTriangle },
  { key: "mostClicked", label: "Most Clicked", icon: MousePointerClick },
  { key: "mostViewed", label: "Most Viewed", icon: Eye },
  { key: "slowSearch", label: "Slow Search", icon: TrendingUp },
  { key: "brokenSearch", label: "Broken Search", icon: AlertTriangle },
] as const;

export default function SearchDashboardPage() {
  return (
    <RequirePermission permission={Permission.SearchRead}>
      <div>
        <PageHeader
          title="Search Dashboard"
          description="运营搜索洞察：Top Queries、无结果查询、点击与慢查询（Commits 059–060）。索引仅通过 BullMQ 自动更新，无手动重建按钮。"
        />

        <div className="mb-6 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p>
            公开 API：<code className="mx-1">GET /v1/search</code> — 支持
            keyword、category、pricing、 language、platform、sort、page。语义搜索默认开启（输入「AI
            PPT」可匹配 Gamma 等）。
          </p>
          <p className="mt-2">
            自动索引：<code className="mx-1">search-tool-index</code> 队列 → Meilisearch（Commit
            052）。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">—</p>
                <code className="mt-2 block text-xs">GET /v1/search/dashboard</code>
              </div>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}
