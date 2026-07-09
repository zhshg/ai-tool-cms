"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { ToolLogo } from "@/components/tools/tool-logo";
import {
  bulkRefreshToolLogos,
  deleteTool,
  fetchTools,
  getApiErrorMessage,
  type AdminTool,
  type ApiError,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function ToolsPage() {
  const pageSize = 50;
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminTool[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [isBulkRefreshingLogos, setIsBulkRefreshingLogos] = useState(false);

  const loadPage = useCallback(
    async (nextPage = page) => {
      setIsLoading(true);
      try {
        const toolsData = await fetchTools(nextPage, pageSize);
        setItems(toolsData.items);
        setTotal(toolsData.total);
        setPage(toolsData.page);
        setError(null);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setMessage("Tool changes saved successfully.");
    }
  }, [searchParams]);

  async function handleDelete(tool: AdminTool) {
    const confirmed = window.confirm(`Delete tool "${tool.name}"?`);
    if (!confirmed) return;

    setActiveToolId(tool.id);
    setError(null);
    try {
      await deleteTool(tool.id);
      setMessage(`Tool "${tool.name}" deleted.`);
      await loadPage(page);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setActiveToolId(null);
    }
  }

  async function handleBulkRefreshLogos() {
    if (!items.length) return;
    setIsBulkRefreshingLogos(true);
    setError(null);
    try {
      const result = await bulkRefreshToolLogos(
        items.map((tool) => tool.id),
        true,
      );
      setMessage(`Queued ${result.queued} logo refresh jobs.`);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsBulkRefreshingLogos(false);
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

        <div className="mb-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleBulkRefreshLogos()}
            disabled={!items.length || isBulkRefreshingLogos}
          >
            {isBulkRefreshingLogos ? "Queueing..." : "Bulk Refresh Logos"}
          </button>
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
            <div className="p-6">
              <p className="text-sm text-muted-foreground">No tools found.</p>
              <Link
                href="/tools/new"
                className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Create your first tool
              </Link>
            </div>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <>
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
                        <div className="flex items-center gap-3">
                          <ToolLogo
                            name={tool.name}
                            logoUrl={tool.logoUrl}
                            fallbackLogoUrl={
                              typeof tool.metadata?.collectedLogoUrl === "string"
                                ? tool.metadata.collectedLogoUrl
                                : typeof tool.metadata?.logo === "string"
                                  ? tool.metadata.logo
                                  : null
                            }
                            categoryIconUrl={tool.categories?.[0]?.category?.iconUrl ?? null}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium">{tool.name}</p>
                            <p className="text-muted-foreground">{tool.slug}</p>
                          </div>
                        </div>
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
                            className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void handleDelete(tool)}
                            disabled={activeToolId === tool.id}
                          >
                            {activeToolId === tool.id ? "Working..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationBar
                page={page}
                total={total}
                pageSize={pageSize}
                onPageChange={(nextPage) => void loadPage(nextPage)}
              />
            </>
          ) : null}
        </div>
      </div>
    </RequirePermission>
  );
}

function PaginationBar({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span className="text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded-md border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
