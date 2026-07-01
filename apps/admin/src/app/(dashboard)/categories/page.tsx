"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { fetchCategories, type AdminCategory, type ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function CategoriesPage() {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: ApiError) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <RequirePermission permission={Permission.CategoriesRead}>
      <div>
        <PageHeader title="Categories" description="Manage taxonomy categories." />

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Total categories</p>
            <p className="mt-2 text-2xl font-semibold">{total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Root categories</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.filter((category) => !category.parentId).length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Child categories</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.filter((category) => category.parentId).length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading categories...</p>
          ) : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {error.message}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No categories found.</p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Sort</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {items.map((category) => (
                  <tr key={category.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
                    <td className="px-4 py-3">{category.sortOrder}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {category.description || "None"}
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
