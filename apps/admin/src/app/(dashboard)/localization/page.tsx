"use client";

import { FileText, Globe, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const statuses = ["Published", "Pending", "AI Generated", "Human Reviewed"] as const;

export default function LocalizationPage() {
  return (
    <RequirePermission permission={Permission.I18nRead}>
      <div>
        <PageHeader
          title="Localization Platform"
          description="Translation Status、按语言重新生成、Regional SEO — Commits 075–076。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => (
            <div key={status} className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{status}</p>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold">—</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <h2 className="text-sm font-medium">重新生成指定语言</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <code>POST /v1/i18n/tools/:toolId/translate</code>
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <h2 className="text-sm font-medium">Regional SEO</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <code>GET /v1/i18n/regional-seo</code>
            </p>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
