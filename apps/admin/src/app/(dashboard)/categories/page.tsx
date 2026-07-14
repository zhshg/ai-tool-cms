"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const pageSize = 50;
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const rootCategories = useMemo(() => items.filter((category) => !category.parentId), [items]);

  const loadCategories = useCallback(
    async (nextPage = page) => {
      setIsLoading(true);
      try {
        const data = await fetchCategories(nextPage, pageSize);
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
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
    void loadCategories();
  }, [loadCategories]);
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
      await loadCategories(page);
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
            <>
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
              <PaginationBar
                page={page}
                total={total}
                pageSize={pageSize}
                onPageChange={(nextPage) => void loadCategories(nextPage)}
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
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  function handleJumpToPage() {
    const nextPage = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(nextPage)) return;
    const clampedPage = Math.min(Math.max(1, nextPage), totalPages);
    if (clampedPage === page) return;
    onPageChange(clampedPage);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleJumpToPage();
              }
            }}
            className="w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Jump to page"
          />
          <button
            type="button"
            className="rounded-md border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleJumpToPage}
            disabled={totalPages <= 1}
          >
            Jump
          </button>
        </div>
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
