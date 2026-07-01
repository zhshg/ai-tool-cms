"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  fetchSettings,
  fetchSettingsSummary,
  type AdminSetting,
  type ApiError,
  type SettingsSummary,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function SettingsPage() {
  const [items, setItems] = useState<AdminSetting[]>([]);
  const [summary, setSummary] = useState<SettingsSummary | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchSettingsSummary()])
      .then(([settings, settingsSummary]) => {
        setItems(settings.items);
        setSummary(settingsSummary);
      })
      .catch((err: ApiError) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <RequirePermission permission={Permission.SettingsRead}>
      <div>
        <PageHeader title="Settings" description="System configuration." />

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Total settings</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.total ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Public</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.publicSettings ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Private</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.privateSettings ?? 0}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading settings...</p>
          ) : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {error.message}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No persisted settings found. Environment variables are still used by services.
            </p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Visibility</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {items.map((setting) => (
                  <tr key={setting.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{setting.key}</td>
                    <td className="px-4 py-3">{setting.group}</td>
                    <td className="px-4 py-3">{setting.isPublic ? "Public" : "Private"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {setting.description || "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </RequirePermission>
  );
}
