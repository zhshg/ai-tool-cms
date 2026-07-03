"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTool,
  fetchCategories,
  fetchTags,
  fetchToolById,
  getApiErrorMessage,
  updateTool,
  type AdminCategory,
  type ApiError,
} from "@/lib/api";

type ToolFormState = {
  name: string;
  slug: string;
  website: string;
  summary: string;
  description: string;
  logoUrl: string;
  status: string;
  primaryCategoryId: string;
  tagIds: string[];
  pricingModel: string;
  metaTitle: string;
  metaDescription: string;
};

const emptyForm: ToolFormState = {
  name: "",
  slug: "",
  website: "",
  summary: "",
  description: "",
  logoUrl: "",
  status: "DRAFT",
  primaryCategoryId: "",
  tagIds: [],
  pricingModel: "FREE",
  metaTitle: "",
  metaDescription: "",
};

type ToolEditorFormProps = {
  mode: "create" | "edit";
  toolId?: string;
};

export function ToolEditorForm({ mode, toolId }: ToolEditorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ToolFormState>(emptyForm);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);

  const primaryCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );

  const loadForm = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesData, tagsData, tool] = await Promise.all([
        fetchCategories(),
        fetchTags(),
        mode === "edit" && toolId ? fetchToolById(toolId) : Promise.resolve(null),
      ]);

      setCategories(categoriesData.items);
      setTags(tagsData.items);

      if (tool) {
        setForm({
          name: String(tool.name ?? ""),
          slug: String(tool.slug ?? ""),
          website: String(tool.website ?? ""),
          summary: String(tool.summary ?? ""),
          description: String(tool.description ?? ""),
          logoUrl: String(tool.logoUrl ?? ""),
          status: String(tool.status ?? "DRAFT"),
          primaryCategoryId:
            Array.isArray(tool.categories) && tool.categories.length
              ? String(tool.categories[0]?.category?.id ?? "")
              : "",
          tagIds:
            Array.isArray(tool.tags) && tool.tags.length
              ? tool.tags.map((tag) => String(tag.tag.id))
              : [],
          pricingModel: String(tool.pricingModel ?? "FREE"),
          metaTitle: String((tool as Record<string, unknown>).metaTitle ?? ""),
          metaDescription: String((tool as Record<string, unknown>).metaDescription ?? ""),
        });
      }

      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [mode, toolId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  async function handleSubmit() {
    if (!form.name.trim() || !form.website.trim()) {
      setError({ status: 400, message: "Name and website are required." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      website: form.website.trim(),
      summary: form.summary.trim() || undefined,
      description: form.description.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      status: form.status,
      categoryIds: form.primaryCategoryId ? [form.primaryCategoryId] : [],
      tagIds: form.tagIds,
      pricingModel: form.pricingModel,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
    };

    try {
      if (mode === "edit" && toolId) {
        await updateTool(toolId, payload);
        setMessage("Tool updated successfully.");
      } else {
        await createTool(payload);
        setMessage("Tool created successfully.");
      }

      router.replace("/tools?success=1");
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/tools" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
          Back to Tools
        </Link>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          onClick={() => router.replace("/tools")}
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
          {isSaving ? "Saving..." : mode === "edit" ? "Save Tool" : "Create Tool"}
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
        {isLoading ? <p className="text-sm text-muted-foreground">Loading tool editor...</p> : null}

        {!isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Name</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Slug</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Website</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.website}
                onChange={(event) =>
                  setForm((current) => ({ ...current, website: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Short Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Long Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Logo URL</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.logoUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, logoUrl: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Status</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="DRAFT">DRAFT</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Primary Category</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.primaryCategoryId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, primaryCategoryId: event.target.value }))
                }
              >
                <option value="">None</option>
                {primaryCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Pricing Type</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.pricingModel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pricingModel: event.target.value }))
                }
              >
                <option value="FREE">FREE</option>
                <option value="FREEMIUM">FREEMIUM</option>
                <option value="PAID">PAID</option>
                <option value="CONTACT">CONTACT</option>
              </select>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Tags</span>
              <div className="grid gap-2 md:grid-cols-3">
                {tags.map((tag) => {
                  const checked = form.tagIds.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            tagIds: event.target.checked
                              ? [...current.tagIds, tag.id]
                              : current.tagIds.filter((id) => id !== tag.id),
                          }))
                        }
                      />
                      <span>{tag.name}</span>
                    </label>
                  );
                })}
              </div>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">SEO Title</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={form.metaTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metaTitle: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">SEO Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                value={form.metaDescription}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metaDescription: event.target.value }))
                }
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
