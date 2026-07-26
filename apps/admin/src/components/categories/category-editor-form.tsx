"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  fetchCategories,
  fetchCategoryById,
  getApiErrorMessage,
  updateCategory,
  type AdminCategory,
  type ApiError,
} from "@/lib/api";

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  iconUrl: string;
  sortOrder: string;
  metaTitle: string;
  metaDescription: string;
};

const emptyForm: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  iconUrl: "",
  sortOrder: "0",
  metaTitle: "",
  metaDescription: "",
};

type CategoryEditorFormProps = {
  mode: "create" | "edit";
  categoryId?: string;
};

export function CategoryEditorForm({ mode, categoryId }: CategoryEditorFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const rootCategories = useMemo(() => items.filter((category) => !category.parentId), [items]);

  const loadForm = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesData, category] = await Promise.all([
        fetchCategories(),
        mode === "edit" && categoryId ? fetchCategoryById(categoryId) : Promise.resolve(null),
      ]);

      setItems(categoriesData.items);

      if (category) {
        setForm({
          name: String(category.name ?? ""),
          slug: String(category.slug ?? ""),
          description: String(category.description ?? ""),
          parentId: String(category.parentId ?? ""),
          iconUrl: String(category.iconUrl ?? ""),
          sortOrder: String(category.sortOrder ?? 0),
          metaTitle: String(category.metaTitle ?? ""),
          metaDescription: String(category.metaDescription ?? ""),
        });
      }

      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [mode, categoryId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError({ status: 400, message: "Category name is required." });
      return;
    }

    if (form.iconUrl.trim()) {
      try {
        new URL(form.iconUrl.trim());
      } catch {
        setError({ status: 400, message: "Icon URL must be a valid URL." });
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      parentId: form.parentId || null,
      iconUrl: form.iconUrl.trim() || undefined,
      sortOrder: Number(form.sortOrder || 0),
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
    };

    try {
      if (mode === "edit" && categoryId) {
        await updateCategory(categoryId, payload);
        setMessage("Category updated successfully.");
      } else {
        await createCategory(payload);
        setMessage("Category created successfully.");
      }

      router.replace("/categories?success=1");
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/categories" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
          Back to Categories
        </Link>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          onClick={() => router.replace("/categories")}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => void handleSubmit()}
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Saving..." : mode === "edit" ? "Save Category" : "Create Category"}
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          API error {error.status}: {getApiErrorMessage(error)}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading category editor...</p>
        ) : null}

        {!isLoading ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <label className="space-y-2 text-sm">
              <span className="font-medium">Name</span>
              <input
                required
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.name}
                onChange={(event) => {
                  setError(null);
                  setForm((current) => ({ ...current, name: event.target.value }));
                }}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Slug</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.slug}
                onChange={(event) => {
                  setError(null);
                  setForm((current) => ({ ...current, slug: event.target.value }));
                }}
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                value={form.description}
                onChange={(event) => {
                  setForm((current) => ({ ...current, description: event.target.value }));
                }}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Parent Category</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.parentId}
                onChange={(event) => {
                  setForm((current) => ({ ...current, parentId: event.target.value }));
                }}
              >
                <option value="">None</option>
                {rootCategories
                  .filter((category) => category.id !== categoryId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Icon URL</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.iconUrl}
                onChange={(event) => {
                  setError(null);
                  setForm((current) => ({ ...current, iconUrl: event.target.value }));
                }}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Sort Order</span>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.sortOrder}
                onChange={(event) => {
                  setForm((current) => ({ ...current, sortOrder: event.target.value }));
                }}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Meta Title</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.metaTitle}
                onChange={(event) => {
                  setForm((current) => ({ ...current, metaTitle: event.target.value }));
                }}
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Meta Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                value={form.metaDescription}
                onChange={(event) => {
                  setForm((current) => ({ ...current, metaDescription: event.target.value }));
                }}
              />
            </label>

            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        ) : null}
      </div>
    </div>
  );
}
