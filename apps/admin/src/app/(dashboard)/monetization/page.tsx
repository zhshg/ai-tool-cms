"use client";

import { Link2, Megaphone, Monitor } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const sections = [
  { key: "affiliate", label: "Affiliate", icon: Link2, api: "GET /v1/affiliate/stats" },
  { key: "sponsored", label: "Sponsored", icon: Megaphone, api: "GET /v1/sponsored" },
  { key: "ads", label: "Ads", icon: Monitor, api: "GET /v1/ads/slots" },
  { key: "newsletter", label: "Newsletter", icon: Megaphone, api: "GET /v1/newsletter/campaigns" },
] as const;

export default function MonetizationPage() {
  return (
    <RequirePermission permission={Permission.MonetizationRead}>
      <div>
        <PageHeader
          title="Monetization"
          description="Affiliate、Sponsored、Ads、Newsletter — Commits 061–065 商业变现模块。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.key} className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{section.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">—</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <code>{section.api}</code>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}
