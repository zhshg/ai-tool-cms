"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCollection,
  fetchCollectionById,
  fetchTools,
  getApiErrorMessage,
  updateCollection,
  type AdminTool,
  type ApiError,
} from "@/lib/api";

type CollectionFormState = {
  name: string;
  slug: string;
  description: string;
  isPublic: boolean;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  heroIntro: string;
  seoSummary: string;
  selectedToolIds: string[];
};

const emptyForm: CollectionFormState = {
  name: "",
  slug: "",
  description: "",
  isPublic: false,
  featured: false,
  metaTitle: "",
  metaDescription: "",
  heroIntro: "",
  seoSummary: "",
  selectedToolIds: [],
};

export function CollectionEditorForm({
  mode,
  collectionId,
}: {
  mode: "create" | "edit";
  collectionId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CollectionFormState>(emptyForm);
  const [tools, setTools] = useState<AdminTool[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTools = useMemo(
    () =>
      form.selectedToolIds
        .map((id) => tools.find((tool) => tool.id === id))
        .filter(Boolean) as AdminTool[],
    [form.selectedToolIds, tools],
  );

  const loadForm = useCallback(async () => {
    setIsLoading(true);
    try {
      const [toolsData, collection] = await Promise.all([
        fetchTools(),
        mode === "edit" && collectionId ? fetchCollectionById(collectionId) : Promise.resolve(null),
      ]);
      setTools(toolsData.items);

      if (collection) {
        const metadata = collection.metadata ?? {};
        setForm({
          name: collection.name ?? "",
          slug: collection.slug ?? "",
          description: collection.description ?? "",
          isPublic: Boolean(collection.isPublic),
          featured: Boolean(metadata.featured),
          metaTitle: metadata.metaTitle ?? "",
          metaDescription: metadata.metaDescription ?? "",
          heroIntro: metadata.heroIntro ?? "",
          seoSummary: metadata.seoSummary ?? "",
          selectedToolIds: (collection.items ?? [])
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((item) => item.tool.id),
        });
      }
      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [mode, collectionId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  function toggleTool(toolId: string) {
    setForm((current) => ({
      ...current,
      selectedToolIds: current.selectedToolIds.includes(toolId)
        ? current.selectedToolIds.filter((id) => id !== toolId)
        : [...current.selectedToolIds, toolId],
    }));
  }

  function moveTool(toolId: string, direction: -1 | 1) {
    setForm((current) => {
      const ids = [...current.selectedToolIds];
      const index = ids.indexOf(toolId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return current;
      [ids[index], ids[nextIndex]] = [ids[nextIndex]!, ids[index]!];
      return { ...current, selectedToolIds: ids };
    });
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError({ status: 400, message: "Collection name is required." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      isPublic: form.isPublic,
      metadata: {
        featured: form.featured,
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        heroIntro: form.heroIntro.trim() || undefined,
        seoSummary: form.seoSummary.trim() || undefined,
      },
      items: form.selectedToolIds.map((toolId, index) => ({ toolId, sortOrder: index })),
    };

    try {
      if (mode === "edit" && collectionId) {
        await updateCollection(collectionId, payload);
        setMessage("Collection updated successfully.");
      } else {
        await createCollection(payload);
        setMessage("Collection created successfully.");
      }
      router.replace("/collections?success=1");
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/collections" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
          Back to Collections
        </Link>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          onClick={() => router.replace("/collections")}
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
          {isSaving ? "Saving..." : mode === "edit" ? "Save Collection" : "Create Collection"}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Collection Content</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading collection editor...</p>
          ) : null}
          {!isLoading ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  required
                />
                <Input
                  label="Slug"
                  value={form.slug}
                  onChange={(value) => setForm((current) => ({ ...current, slug: value }))}
                />
              </div>
              <Textarea
                label="Description"
                value={form.description}
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
              />
              <Textarea
                label="Hero Intro"
                value={form.heroIntro}
                onChange={(value) => setForm((current) => ({ ...current, heroIntro: value }))}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="SEO Title"
                  value={form.metaTitle}
                  onChange={(value) => setForm((current) => ({ ...current, metaTitle: value }))}
                />
                <Textarea
                  label="SEO Description"
                  value={form.metaDescription}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, metaDescription: value }))
                  }
                />
              </div>
              <Textarea
                label="SEO Summary"
                value={form.seoSummary}
                onChange={(value) => setForm((current) => ({ ...current, seoSummary: value }))}
              />
              <button type="submit" className="hidden" aria-hidden="true" />
            </form>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Publishing</h2>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isPublic: event.target.checked }))
                }
              />
              Public collection
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  setForm((current) => ({ ...current, featured: event.target.checked }))
                }
              />
              Featured
            </label>
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Selected Tools</h2>
            <div className="mt-4 space-y-2">
              {selectedTools.length ? (
                selectedTools.map((tool, index) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <span className="truncate">
                      {index + 1}. {tool.name}
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className="rounded border px-2"
                        onClick={() => moveTool(tool.id, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2"
                        onClick={() => moveTool(tool.id, 1)}
                      >
                        Down
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tools selected.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Add Tools</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <label key={tool.id} className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={form.selectedToolIds.includes(tool.id)}
                onChange={() => toggleTool(tool.id)}
              />
              <span>
                <span className="block font-medium">{tool.name}</span>
                <span className="line-clamp-2 text-muted-foreground">
                  {tool.summary || tool.slug}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        required={required}
        className="w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
