"use client";

import { Globe, Languages, MapPin, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "languages", label: "Languages", icon: Languages },
  { key: "countries", label: "Countries", icon: MapPin },
  { key: "translation", label: "Translation Progress", icon: Globe },
  { key: "index", label: "Index Status", icon: Search },
  { key: "revenue", label: "Revenue by Region", icon: Globe },
  { key: "locale", label: "Top Locale", icon: Languages },
] as const;

export default function GlobalPage() {
  return (
    <RequirePermission permission={Permission.GlobalRead}>
      <div>
        <PageHeader
          title="Global Launch Dashboard"
          description="Languages、Countries、Translation Progress、Index Status、Revenue by Region — Commit 080。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <code>GET /v1/global/dashboard</code>
            </li>
            <li>
              <code>GET /v1/global/countries</code>
            </li>
            <li>
              <code>GET /v1/i18n/locales</code>
            </li>
          </ul>
        </div>
      </div>
    </RequirePermission>
  );
}
