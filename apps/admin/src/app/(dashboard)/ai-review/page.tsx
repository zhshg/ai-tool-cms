"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { fetchAiRevisions, type AiRevision, type ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";

type ReviewTab = "PENDING" | "APPROVED" | "REJECTED";

const tabs: { key: ReviewTab; label: string; icon: typeof Bot }[] = [
  { key: "PENDING", label: "Pending", icon: Bot },
  { key: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { key: "REJECTED", label: "Rejected", icon: XCircle },
];

export default function AiReviewPage() {
  const [activeTab, setActiveTab] = useState<ReviewTab>("PENDING");
  const [items, setItems] = useState<AiRevision[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchAiRevisions(activeTab)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: ApiError) => setError(err))
      .finally(() => setIsLoading(false));
  }, [activeTab]);

  return (
    <RequirePermission permission={Permission.AiRead}>
      <div>
        <PageHeader
          title="AI Review"
          description="Review AI-generated content revisions before publication."
        />

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-card-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Current status</p>
            <p className="mt-2 text-2xl font-semibold">{activeTab}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Total revisions</p>
            <p className="mt-2 text-2xl font-semibold">{total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Average quality</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.length
                ? Math.round(
                    items.reduce((sum, item) => sum + (item.qualityScore ?? 0), 0) / items.length,
                  )
                : 0}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-medium">Content revisions</h2>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                fetchAiRevisions(activeTab)
                  .then((data) => {
                    setItems(data.items);
                    setTotal(data.total);
                    setError(null);
                  })
                  .catch((err: ApiError) => setError(err))
                  .finally(() => setIsLoading(false));
              }}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading revisions...</p>
          ) : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {error.message}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No revisions found.</p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Quality</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((revision) => (
                  <tr key={revision.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{revision.tool?.name ?? "Unknown"}</td>
                    <td className="px-4 py-3">{revision.stage}</td>
                    <td className="px-4 py-3">{revision.qualityScore ?? "N/A"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(revision.createdAt).toLocaleString()}
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
