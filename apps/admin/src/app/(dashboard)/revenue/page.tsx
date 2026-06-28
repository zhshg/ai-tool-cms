"use client";

import { DollarSign, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "total", label: "Total Revenue", icon: DollarSign },
  { key: "weekly", label: "Weekly", icon: TrendingUp },
  { key: "monthly", label: "Monthly", icon: TrendingUp },
  { key: "affiliate", label: "Affiliate", icon: DollarSign },
  { key: "ads", label: "Ads", icon: DollarSign },
  { key: "sponsored", label: "Sponsored", icon: DollarSign },
  { key: "api", label: "API", icon: DollarSign },
] as const;

export default function RevenuePage() {
  return (
    <RequirePermission permission={Permission.RevenueRead}>
      <div>
        <PageHeader
          title="Revenue Dashboard"
          description="Affiliate、Ads、Sponsored、API 收益汇总 — Commit 069。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium">API</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <code>GET /v1/revenue/overview</code>
          </p>
        </div>
      </div>
    </RequirePermission>
  );
}
