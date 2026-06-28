"use client";

import { BarChart3, Globe, LineChart, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "pv", label: "PV", icon: EyeIcon },
  { key: "uv", label: "UV", icon: Users },
  { key: "ctr", label: "CTR", icon: LineChart },
  { key: "bounce", label: "Bounce", icon: BarChart3 },
] as const;

function EyeIcon(props: React.ComponentProps<typeof Globe>) {
  return <Globe {...props} />;
}

const providers = ["Google Analytics 4", "PostHog", "Umami"] as const;

export default function AnalyticsPage() {
  return (
    <RequirePermission permission={Permission.AnalyticsRead}>
      <div>
        <PageHeader
          title="Analytics"
          description="多源分析：GA4、PostHog、Umami — PV、UV、CTR、跳出率、搜索词与热门页面（Commit 058）。"
        />

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {providers.map((name) => (
            <div key={name} className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">{name}</p>
              <p className="mt-2 text-xs text-muted-foreground">配置凭证后接入实时数据</p>
            </div>
          ))}
        </div>

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

        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium">API</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <code>GET /v1/analytics/providers</code>
            </li>
            <li>
              <code>GET /v1/analytics/overview</code>
            </li>
          </ul>
        </div>
      </div>
    </RequirePermission>
  );
}
