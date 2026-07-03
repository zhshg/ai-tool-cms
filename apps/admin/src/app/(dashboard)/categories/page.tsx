"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  deleteCategory,
  fetchCategories,
  getApiErrorMessage,
  type AdminCategory,
  type ApiError,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const rootCategories = useMemo(() => items.filter((category) => !category.parentId), [items]);

  async function loadCategories() {
    setIsLoading(true);
    try {
      const data = await fetchCategories();
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setMessage("Category changes saved successfully.");
    }
  }, [searchParams]);

  async function handleDelete(category: AdminCategory) {
    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) return;

    setActiveCategoryId(category.id);
    setError(null);
    try {
      await deleteCategory(category.id);
      setMessage(`Category "${category.name}" deleted.`);
      await loadCategories();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setActiveCategoryId(null);
    }
  }

  return (
    <RequirePermission permission={Permission.CategoriesRead}>
      <div>
        <PageHeader
          title="Categories"
          description="Create, edit, and manage taxonomy categories."
        />

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Total categories</p>
            <p className="mt-2 text-2xl font-semibold">{total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Root categories</p>
            <p className="mt-2 text-2xl font-semibold">{rootCategories.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Child categories</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.filter((category) => category.parentId).length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <Link
            href="/categories/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            New Category
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {message ? (
            <p className="border-b bg-emerald-50 px-6 py-3 text-sm text-emerald-700">{message}</p>
          ) : null}
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading categories...</p>
          ) : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {getApiErrorMessage(error)}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">No categories found.</p>
              <Link
                href="/categories/new"
                className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Create your first category
              </Link>
            </div>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Sort</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
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
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/categories/${category.id}/edit`}
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void handleDelete(category)}
                          disabled={activeCategoryId === category.id}
                        >
                          {activeCategoryId === category.id ? "Working..." : "Delete"}
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
