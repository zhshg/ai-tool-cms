"use client";

import { Key, Webhook } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function PlatformPage() {
  return (
    <RequirePermission permission={Permission.PlatformRead}>
      <div>
        <PageHeader
          title="Developer Platform"
          description="API Key、Rate Limit、Webhook — Commits 066–067，支持 Zapier / n8n / Make。"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <h2 className="text-sm font-medium">API Keys</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              <code>GET /v1/platform/api-keys</code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <code>POST /v1/platform/api-keys</code>
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <h2 className="text-sm font-medium">Webhooks</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              <code>GET /v1/platform/webhooks</code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tool Added / Updated / AI Generated / Crawler / SEO
            </p>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
