"use client";

import { BarChart3, DollarSign, MousePointer, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "clicks", label: "Clicks", icon: MousePointer },
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "conversions", label: "Conversions", icon: BarChart3 },
  { key: "api", label: "API Calls", icon: Phone },
] as const;

export default function PartnersPage() {
  return (
    <RequirePermission permission={Permission.PartnerRead}>
      <div>
        <PageHeader
          title="Partner Dashboard"
          description="合作伙伴查看 Clicks、Revenue、Conversions、API Calls — Commit 068。"
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
          <p className="text-sm text-muted-foreground">
            <code>GET /v1/partners/dashboard</code>
          </p>
        </div>
      </div>
    </RequirePermission>
  );
}
