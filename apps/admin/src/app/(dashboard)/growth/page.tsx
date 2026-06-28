"use client";

import { BarChart3, Globe, Search, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "traffic", label: "Traffic", icon: Globe },
  { key: "seo", label: "SEO", icon: TrendingUp },
  { key: "search", label: "Search CTR", icon: Search },
  { key: "conversion", label: "Conversion", icon: BarChart3 },
  { key: "revenue", label: "Revenue", icon: TrendingUp },
] as const;

export default function GrowthPage() {
  return (
    <RequirePermission permission={Permission.GrowthRead}>
      <div>
        <PageHeader
          title="Growth Center"
          description="运营每日一站：Traffic、SEO、Search、CTR、Conversion、Revenue、Top Tools — Commit 070。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.key} className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">—</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Top Tools</h2>
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Top Keywords</h2>
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            <code>GET /v1/growth/center</code>
          </p>
        </div>
      </div>
    </RequirePermission>
  );
}
