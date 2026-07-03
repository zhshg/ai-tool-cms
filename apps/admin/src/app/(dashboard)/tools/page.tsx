"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  deleteTool,
  fetchTools,
  getApiErrorMessage,
  type AdminTool,
  type ApiError,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function ToolsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminTool[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPage() {
    setIsLoading(true);
    try {
      const toolsData = await fetchTools();
      setItems(toolsData.items);
      setTotal(toolsData.total);
      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setMessage("Tool changes saved successfully.");
    }
  }, [searchParams]);

  async function handleDelete(tool: AdminTool) {
    const confirmed = window.confirm(`Delete tool "${tool.name}"?`);
    if (!confirmed) return;

    try {
      await deleteTool(tool.id);
      setMessage(`Tool "${tool.name}" deleted.`);
      await loadPage();
    } catch (err) {
      setError(err as ApiError);
    }
  }

  return (
    <RequirePermission permission={Permission.ToolsRead}>
      <div>
        <PageHeader title="Tools" description="Create, edit, and manage AI tool content." />

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Total tools</p>
            <p className="mt-2 text-2xl font-semibold">{total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.filter((tool) => tool.status === "PUBLISHED").length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Draft</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.filter((tool) => tool.status === "DRAFT").length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <Link
            href="/tools/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            New Tool
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {message ? (
            <p className="border-b bg-emerald-50 px-6 py-3 text-sm text-emerald-700">{message}</p>
          ) : null}
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading tools...</p> : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {getApiErrorMessage(error)}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No tools found.</p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tool) => (
                  <tr key={tool.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{tool.name}</p>
                      <p className="text-muted-foreground">{tool.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tool.categories?.map((item) => item.category.name).join(", ") || "None"}
                    </td>
                    <td className="px-4 py-3">{tool.pricingModel}</td>
                    <td className="px-4 py-3">{tool.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tool.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/tools/${tool.id}/edit`}
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                          onClick={() => void handleDelete(tool)}
                        >
                          Delete
                        </button>
                      </div>
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
