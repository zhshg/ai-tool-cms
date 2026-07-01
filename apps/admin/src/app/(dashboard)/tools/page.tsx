"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { fetchTools, type AdminTool, type ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function ToolsPage() {
  const [items, setItems] = useState<AdminTool[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTools()
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: ApiError) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <RequirePermission permission={Permission.ToolsRead}>
      <div>
        <PageHeader title="Tools" description="Manage AI tools catalog status and taxonomy." />

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

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading tools...</p> : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {error.message}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No tools found.</p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                  <th className="px-4 py-3 font-medium">Categories</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tool) => (
                  <tr key={tool.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{tool.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tool.slug}</td>
                    <td className="px-4 py-3">{tool.status}</td>
                    <td className="px-4 py-3">{tool.pricingModel}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tool.categories?.map((item) => item.category.name).join(", ") || "None"}
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
