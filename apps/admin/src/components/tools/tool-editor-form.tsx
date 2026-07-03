"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ToolLogo } from "@/components/tools/tool-logo";
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
  collectedLogoUrl: string;
  status: string;
  primaryCategoryId: string;
  tagIds: string[];
  pricingModel: string;
  metaTitle: string;
  metaDescription: string;
  features: string[];
  screenshots: string[];
  faqs: Array<{ question: string; answer: string }>;
};

const emptyForm: ToolFormState = {
  name: "",
  slug: "",
  website: "",
  summary: "",
  description: "",
  logoUrl: "",
  collectedLogoUrl: "",
  status: "DRAFT",
  primaryCategoryId: "",
  tagIds: [],
  pricingModel: "FREE",
  metaTitle: "",
  metaDescription: "",
  features: [],
  screenshots: [],
  faqs: [],
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
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const primaryCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );
  const selectedTags = useMemo(
    () => tags.filter((tag) => form.tagIds.includes(tag.id)),
    [form.tagIds, tags],
  );
  const primaryCategory = useMemo(
    () => primaryCategories.find((category) => category.id === form.primaryCategoryId) ?? null,
    [form.primaryCategoryId, primaryCategories],
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
        const metadata = ((tool as Record<string, unknown>).metadata ?? {}) as Record<
          string,
          unknown
        >;
        setForm({
          name: String(tool.name ?? ""),
          slug: String(tool.slug ?? ""),
          website: String(tool.website ?? ""),
          summary: String(tool.summary ?? ""),
          description: String(tool.description ?? ""),
          logoUrl: String(tool.logoUrl ?? ""),
          collectedLogoUrl: resolveString(
            metadata.collectedLogoUrl ??
              metadata.logo ??
              metadata.faviconUrl ??
              metadata.appleTouchIconUrl ??
              metadata.openGraphImageUrl,
          ),
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
          metaTitle: String(tool.metaTitle ?? ""),
          metaDescription: String(tool.metaDescription ?? ""),
          features: normalizeStringList(metadata.features),
          screenshots: normalizeStringList(metadata.screenshots),
          faqs: Array.isArray(tool.faqs)
            ? tool.faqs
                .map((faq) => ({
                  question: String(faq.question ?? "").trim(),
                  answer: String(faq.answer ?? "").trim(),
                }))
                .filter((faq) => faq.question && faq.answer)
            : [],
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
    const name = form.name.trim();
    const website = form.website.trim();

    if (!name || !website) {
      setError({ status: 400, message: "Name and website are required." });
      return;
    }

    try {
      new URL(website);
    } catch {
      setError({ status: 400, message: "Website must be a valid URL." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      name,
      slug: form.slug.trim() || undefined,
      website,
      summary: form.summary.trim() || undefined,
      description: form.description.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      status: form.status,
      categoryIds: form.primaryCategoryId ? [form.primaryCategoryId] : [],
      tagIds: form.tagIds,
      pricingModel: form.pricingModel,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      metadata: {
        features: form.features.map((item) => item.trim()).filter(Boolean),
        screenshots: form.screenshots.map((item) => item.trim()).filter(Boolean),
      },
      faqs: form.faqs
        .map((faq) => ({
          question: faq.question.trim(),
          answer: faq.answer.trim(),
        }))
        .filter((faq) => faq.question && faq.answer),
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
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-4 md:grid-cols-2">
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
                  <span className="font-medium">Website</span>
                  <input
                    required
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.website}
                    onChange={(event) => {
                      setError(null);
                      setForm((current) => ({ ...current, website: event.target.value }));
                    }}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Short Description</span>
                  <textarea
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                    value={form.summary}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, summary: event.target.value }));
                    }}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Long Description</span>
                  <textarea
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                    value={form.description}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, description: event.target.value }));
                    }}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Logo URL</span>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.logoUrl}
                    onChange={(event) => {
                      setError(null);
                      setForm((current) => ({ ...current, logoUrl: event.target.value }));
                    }}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Status</span>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.status}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, status: event.target.value }));
                    }}
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
                    onChange={(event) => {
                      setForm((current) => ({ ...current, primaryCategoryId: event.target.value }));
                    }}
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
                    onChange={(event) => {
                      setForm((current) => ({ ...current, pricingModel: event.target.value }));
                    }}
                  >
                    <option value="FREE">FREE</option>
                    <option value="FREEMIUM">FREEMIUM</option>
                    <option value="PAID">PAID</option>
                    <option value="CONTACT">CONTACT</option>
                  </select>
                </label>
              </div>

              <aside className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-medium">Tool Icon Preview</p>
                <div className="mt-4 flex items-center gap-4">
                  <ToolLogo
                    name={form.name || "AI Tool"}
                    logoUrl={form.logoUrl}
                    fallbackLogoUrl={form.collectedLogoUrl}
                    categoryIconUrl={primaryCategory?.iconUrl ?? null}
                    size="lg"
                  />
                  <div className="text-sm text-muted-foreground">
                    <p>Fallback order:</p>
                    <p>`Tool.logo` → collected logo → initials → category icon → AI icon</p>
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Tags</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Show selected tags by default and add more only when needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setShowTagPicker((current) => !current)}
                  >
                    {showTagPicker ? "Hide tag picker" : "Add tag"}
                  </button>
                </div>

                {selectedTags.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm"
                      >
                        {tag.name}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              tagIds: current.tagIds.filter((id) => id !== tag.id),
                            }))
                          }
                          aria-label={`Remove ${tag.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No tags selected yet.
                  </p>
                )}

                {showTagPicker ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {tags.length === 0 ? (
                      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">
                        No tags available yet.
                      </p>
                    ) : null}
                    {tags.map((tag) => {
                      const checked = form.tagIds.includes(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className={[
                            "flex items-center gap-2 rounded-md border p-3 text-sm transition",
                            checked ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                          ].join(" ")}
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
                ) : null}
              </div>

              <div className="rounded-lg border p-4">
                <div>
                  <h2 className="text-sm font-semibold">SEO</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep search snippets aligned with the directory landing pages.
                  </p>
                </div>
                <div className="mt-4 grid gap-4">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">SEO Title</span>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.metaTitle}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, metaTitle: event.target.value }));
                      }}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">SEO Description</span>
                    <textarea
                      className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                      value={form.metaDescription}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, metaDescription: event.target.value }));
                      }}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <EditableStringListSection
                title="Features"
                description="Add short feature bullets shown on the public tool detail page."
                items={form.features}
                placeholder="Add a feature"
                onChange={(items) => setForm((current) => ({ ...current, features: items }))}
              />

              <EditableStringListSection
                title="Screenshots"
                description="Store public screenshot URLs when manual assets are available."
                items={form.screenshots}
                placeholder="https://example.com/screenshot.png"
                onChange={(items) => setForm((current) => ({ ...current, screenshots: items }))}
              />

              <EditableFaqSection
                items={form.faqs}
                onChange={(items) => setForm((current) => ({ ...current, faqs: items }))}
              />
            </section>

            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
        ) : null}
      </div>
    </div>
  );
}

function EditableStringListSection({
  title,
  description,
  items,
  placeholder,
  onChange,
}: {
  title: string;
  description: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  function updateItem(index: number, value: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No items added yet.
          </p>
        ) : null}

        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-2">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={item}
              placeholder={placeholder}
              onChange={(event) => updateItem(index, event.target.value)}
            />
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => removeItem(index)}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          onClick={() => onChange([...items, ""])}
        >
          Add item
        </button>
      </div>
    </div>
  );
}

function EditableFaqSection({
  items,
  onChange,
}: {
  items: Array<{ question: string; answer: string }>;
  onChange: (items: Array<{ question: string; answer: string }>) => void;
}) {
  function updateItem(index: number, patch: Partial<{ question: string; answer: string }>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">FAQ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain question and answer pairs used by the public detail page and JSON-LD.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No FAQ entries yet.
          </p>
        ) : null}

        {items.map((item, index) => (
          <div key={`faq-${index}`} className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Question</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                value={item.question}
                onChange={(event) => updateItem(index, { question: event.target.value })}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Answer</span>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
                value={item.answer}
                onChange={(event) => updateItem(index, { answer: event.target.value })}
              />
            </label>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => removeItem(index)}
            >
              Remove FAQ
            </button>
          </div>
        ))}

        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          onClick={() => onChange([...items, { question: "", answer: "" }])}
        >
          Add FAQ
        </button>
      </div>
    </div>
  );
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function resolveString(value: unknown) {
  return typeof value === "string" ? value : "";
}
