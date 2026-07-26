"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  deleteCollection,
  fetchCollections,
  getApiErrorMessage,
  type AdminCollection,
  type ApiError,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function CollectionsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminCollection[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const featuredCount = useMemo(
    () => items.filter((collection) => Boolean(collection.metadata?.featured)).length,
    [items],
  );

  async function loadCollections() {
    setIsLoading(true);
    try {
      const data = await fetchCollections();
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
    void loadCollections();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setMessage("Collection changes saved successfully.");
    }
  }, [searchParams]);

  async function handleDelete(collection: AdminCollection) {
    const confirmed = window.confirm(`Delete collection "${collection.name}"?`);
    if (!confirmed) return;

    setActiveId(collection.id);
    setError(null);
    try {
      await deleteCollection(collection.id);
      setMessage(`Collection "${collection.name}" deleted.`);
      await loadCollections();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setActiveId(null);
    }
  }

  return (
    <RequirePermission permission={Permission.SeoRead}>
      <div>
        <PageHeader
          title="Collections"
          description="Create curated AI tool collections for editorial landing pages."
        />

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <Stat label="Total collections" value={total} />
          <Stat label="Public collections" value={items.filter((item) => item.isPublic).length} />
          <Stat label="Featured collections" value={featuredCount} />
        </div>

        <div className="mb-6 flex justify-end">
          <Link
            href="/collections/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            New Collection
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {message ? (
            <p className="border-b bg-emerald-50 px-6 py-3 text-sm text-emerald-700">{message}</p>
          ) : null}
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading collections...</p>
          ) : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {getApiErrorMessage(error)}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">No collections found.</p>
              <Link
                href="/collections/new"
                className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Create your first collection
              </Link>
            </div>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Tools</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">SEO</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((collection) => (
                  <tr key={collection.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{collection.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{collection.slug}</td>
                    <td className="px-4 py-3">{collection.items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {collection.isPublic ? "Public" : "Draft"}
                      {collection.metadata?.featured ? " �� Featured" : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {collection.metadata?.metaTitle ? "Configured" : "Needs SEO"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {collection.isPublic ? (
                          <a
                            href={`/en/collections/${collection.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                          >
                            View
                          </a>
                        ) : null}
                        <Link
                          href={`/collections/${collection.id}/edit`}
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
                          onClick={() => void handleDelete(collection)}
                          disabled={activeId === collection.id}
                        >
                          {activeId === collection.id ? "Working..." : "Delete"}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
