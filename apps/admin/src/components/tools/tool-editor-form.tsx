"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ToolLogo } from "@/components/tools/tool-logo";
import {
  createTool,
  fetchCategories,
  fetchTags,
  fetchToolById,
  getApiErrorMessage,
  getToolPreviewUrl,
  previewToolLogo,
  refreshToolLogo,
  uploadToolAsset,
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
  canonicalUrl: string;
  openGraphImageUrl: string;
  features: string[];
  useCases: string[];
  alternatives: string[];
  screenshots: string[];
  faqs: Array<{ question: string; answer: string }>;
  createdAt: string;
  updatedAt: string;
  completenessScore: number | null;
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
  canonicalUrl: "",
  openGraphImageUrl: "",
  features: [],
  useCases: [],
  alternatives: [],
  screenshots: [],
  faqs: [],
  createdAt: "",
  updatedAt: "",
  completenessScore: null,
};

type ToolEditorFormProps = { mode: "create" | "edit"; toolId?: string };

export function ToolEditorForm({ mode, toolId }: ToolEditorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ToolFormState>(emptyForm);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isPreviewingLogo, setIsPreviewingLogo] = useState(false);
  const [isRefreshingLogo, setIsRefreshingLogo] = useState(false);
  const [isSlugDirty, setIsSlugDirty] = useState(mode === "edit");

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
  const availableTags = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    const unselected = tags.filter((tag) => !form.tagIds.includes(tag.id));
    if (!query) return unselected.slice(0, 12);
    return unselected
      .filter(
        (tag) => tag.name.toLowerCase().includes(query) || tag.slug.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }, [form.tagIds, tagQuery, tags]);
  const seoScore = useMemo(() => {
    const checks = [
      form.metaTitle,
      form.metaDescription,
      form.canonicalUrl || form.website,
      form.openGraphImageUrl || form.logoUrl,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    form.canonicalUrl,
    form.logoUrl,
    form.metaDescription,
    form.metaTitle,
    form.openGraphImageUrl,
    form.website,
  ]);
  const contentCompleteness = useMemo(() => {
    if (typeof form.completenessScore === "number") return form.completenessScore;
    const checks = [
      form.name,
      form.slug,
      form.website,
      form.summary,
      form.description,
      form.logoUrl || form.collectedLogoUrl,
      form.primaryCategoryId,
      form.tagIds.length,
      form.features.length,
      form.screenshots.length,
      form.faqs.length,
      form.metaTitle,
      form.metaDescription,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);
  const previewUrl = useMemo(
    () =>
      getToolPreviewUrl({
        slug: form.slug,
        name: form.name,
        website: form.website,
      }),
    [form.name, form.slug, form.website],
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
          canonicalUrl: resolveString(metadata.canonicalUrl),
          openGraphImageUrl: resolveString(metadata.openGraphImageUrl),
          features: normalizeStringList(metadata.features),
          useCases: normalizeStringList(metadata.useCases ?? metadata.aiUseCases),
          alternatives: normalizeStringList(
            metadata.alternatives ?? metadata.alternativeNames ?? metadata.alternativeSlugs,
          ),
          screenshots: normalizeStringList(metadata.screenshots),
          faqs: Array.isArray(tool.faqs)
            ? tool.faqs
                .map((faq) => ({
                  question: String(faq.question ?? "").trim(),
                  answer: String(faq.answer ?? "").trim(),
                }))
                .filter((faq) => faq.question && faq.answer)
            : [],
          createdAt: String(tool.createdAt ?? ""),
          updatedAt: String(tool.updatedAt ?? ""),
          completenessScore:
            typeof tool.completenessScore === "number" ? tool.completenessScore : null,
        });
        setIsSlugDirty(true);
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

  async function submitTool(nextStatus?: string) {
    const name = form.name.trim();
    const website = form.website.trim();
    const summary = form.summary.trim();
    const status = nextStatus ?? form.status;
    if (!name || !website)
      return setError({ status: 400, message: "Name and website are required." });
    if (!form.primaryCategoryId) {
      return setError({ status: 400, message: "Primary category is required." });
    }
    if (!["DRAFT", "PUBLISHED"].includes(status)) {
      return setError({ status: 400, message: "Status must be DRAFT or PUBLISHED." });
    }
    if (summary.length > 120) {
      return setError({ status: 400, message: "Short description must be 120 characters or fewer." });
    }
    if (form.metaTitle.trim().length > 60) {
      return setError({ status: 400, message: "SEO title should be 60 characters or fewer." });
    }
    if (form.metaDescription.trim().length > 160) {
      return setError({
        status: 400,
        message: "SEO description should be 160 characters or fewer.",
      });
    }
    try {
      new URL(website);
    } catch {
      return setError({ status: 400, message: "Website must be a valid URL." });
    }
    setIsSaving(true);
    setMessage(null);
    setError(null);
    const payload = {
      name,
      slug: form.slug.trim() || undefined,
      website,
      summary: summary || undefined,
      description: form.description.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      status,
      categoryIds: form.primaryCategoryId ? [form.primaryCategoryId] : [],
      tagIds: form.tagIds,
      pricingModel: form.pricingModel,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      metadata: {
        canonicalUrl: form.canonicalUrl.trim() || undefined,
        openGraphImageUrl: form.openGraphImageUrl.trim() || undefined,
        features: form.features.map((item) => item.trim()).filter(Boolean),
        useCases: form.useCases.map((item) => item.trim()).filter(Boolean),
        alternatives: form.alternatives.map((item) => item.trim()).filter(Boolean),
        alternativeSlugs: form.alternatives
          .map((item) => slugifyToolValue(item))
          .filter(Boolean),
        screenshots: form.screenshots.map((item) => item.trim()).filter(Boolean),
      },
      faqs: form.faqs
        .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
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

  async function handleLogoPreview() {
    if (!toolId) return;
    setIsPreviewingLogo(true);
    setError(null);
    try {
      const preview = await previewToolLogo(toolId);
      const validCount = preview.candidates.filter((candidate) => candidate.ok).length;
      setMessage(
        `Logo preview found ${validCount} valid candidate(s). Recommended source: ${preview.recommendedSource ?? "none"}.`,
      );
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsPreviewingLogo(false);
    }
  }

  async function handleLogoRefresh() {
    if (!toolId) return;
    setIsRefreshingLogo(true);
    setError(null);
    try {
      const result = await refreshToolLogo(toolId, true);
      setMessage(`Logo refresh queued. Job: ${result.jobId}.`);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsRefreshingLogo(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploadingLogo(true);
    setError(null);
    try {
      const asset = await uploadToolAsset(file, "logo");
      setForm((current) => ({ ...current, logoUrl: asset.url }));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleScreenshotUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploadingScreenshot(true);
    setError(null);
    try {
      const asset = await uploadToolAsset(file, "screenshot");
      setForm((current) => ({ ...current, screenshots: [...current.screenshots, asset.url] }));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsUploadingScreenshot(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Tools</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "edit" ? "Edit Tool" : "Create Tool"}
          </h1>
        </div>
        <Link href="/tools" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
          Back to Tools
        </Link>
      </div>
      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          API error {error.status}: {getApiErrorMessage(error)}
        </div>
      ) : null}
      {isLoading ? (
        <EditorCard title="Loading">Loading tool editor...</EditorCard>
      ) : (
        <form
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={(event) => {
            event.preventDefault();
            void submitTool();
          }}
        >
          <div className="space-y-6">
            <EditorCard title="Basic Information">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Name"
                  required
                  value={form.name}
                  onChange={(value) => {
                    setError(null);
                    setForm((current) => ({
                      ...current,
                      name: value,
                      slug:
                        mode === "create" && !isSlugDirty
                          ? slugifyToolValue(value)
                          : current.slug,
                    }));
                  }}
                />
                <TextField
                  label="Slug"
                  value={form.slug}
                  onChange={(value) => {
                    setError(null);
                    setIsSlugDirty(true);
                    setForm((current) => ({ ...current, slug: value }));
                  }}
                />
                <TextField
                  label="Website"
                  required
                  className="md:col-span-2"
                  value={form.website}
                  onChange={(value) => {
                    setError(null);
                    setForm((current) => ({ ...current, website: value }));
                  }}
                />
                <div className="rounded-lg border bg-muted/20 p-4 md:col-span-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <ToolLogo
                      name={form.name || "AI Tool"}
                      logoUrl={form.logoUrl}
                      fallbackLogoUrl={form.collectedLogoUrl}
                      categoryIconUrl={primaryCategory?.iconUrl ?? null}
                      size="lg"
                    />
                    <UploadButton
                      label={isUploadingLogo ? "Uploading..." : "Upload Logo"}
                      isLoading={isUploadingLogo}
                      icon="image"
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
                <TextField
                  label="Logo URL"
                  className="md:col-span-2"
                  value={form.logoUrl}
                  onChange={(value) => {
                    setError(null);
                    setForm((current) => ({ ...current, logoUrl: value }));
                  }}
                />
                <TextareaField
                  label="Short Description"
                  description={`${form.summary.trim().length}/120 characters`}
                  value={form.summary}
                  onChange={(value) => setForm((current) => ({ ...current, summary: value }))}
                />
                <TextareaField
                  label="Long Description"
                  value={form.description}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                />
              </div>
            </EditorCard>

            <EditorCard title="Taxonomy">
              <div className="space-y-5">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Primary Category</span>
                  <select
                    required
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.primaryCategoryId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, primaryCategoryId: event.target.value }))
                    }
                  >
                    <option value="">Select a category</option>
                    {primaryCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">Tags</h3>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => {
                        setShowTagPicker((current) => !current);
                        setTagQuery("");
                      }}
                    >
                      <Plus className="size-4" />
                      Add Tag
                    </button>
                  </div>
                  {selectedTags.length ? (
                    <div className="flex flex-wrap gap-2">
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
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      No tags selected.
                    </p>
                  )}
                  {showTagPicker ? (
                    <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
                          value={tagQuery}
                          placeholder="Search tags"
                          onChange={(event) => setTagQuery(event.target.value)}
                        />
                      </label>
                      <div className="mt-3 grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            className="flex items-center justify-between rounded-md border bg-background p-3 text-left text-sm hover:bg-muted"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                tagIds: [...current.tagIds, tag.id],
                              }))
                            }
                          >
                            <span>{tag.name}</span>
                            <Plus className="size-4 text-muted-foreground" />
                          </button>
                        ))}
                        {availableTags.length === 0 ? (
                          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">
                            No matching tags.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </EditorCard>

            <EditableStringListSection
              title="Features"
              description="Short, scannable feature bullets."
              items={form.features}
              placeholder="Add a feature"
              addLabel="Add Feature"
              onChange={(items) => setForm((current) => ({ ...current, features: items }))}
            />
            <EditableStringListSection
              title="Use Cases"
              description="Key workflows or scenarios this tool fits."
              items={form.useCases}
              placeholder="Add a use case"
              addLabel="Add Use Case"
              onChange={(items) => setForm((current) => ({ ...current, useCases: items }))}
            />
            <EditableStringListSection
              title="Alternatives"
              description="Enter related published tool names or slugs, one item per row."
              items={form.alternatives}
              placeholder="e.g. chatgpt or ChatGPT"
              addLabel="Add Alternative"
              onChange={(items) => setForm((current) => ({ ...current, alternatives: items }))}
            />
            <EditableStringListSection
              title="Screenshots"
              description="Upload assets or keep direct screenshot URLs."
              items={form.screenshots}
              placeholder="https://example.com/screenshot.png"
              addLabel="Add Screenshot"
              onChange={(items) => setForm((current) => ({ ...current, screenshots: items }))}
              onUpload={handleScreenshotUpload}
              isUploading={isUploadingScreenshot}
            />
            <EditableFaqSection
              items={form.faqs}
              onChange={(items) => setForm((current) => ({ ...current, faqs: items }))}
            />

            <EditorCard title="SEO">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Title"
                  description={`${form.metaTitle.trim().length}/60 characters`}
                  value={form.metaTitle}
                  onChange={(value) => setForm((current) => ({ ...current, metaTitle: value }))}
                />
                <TextField
                  label="Canonical"
                  value={form.canonicalUrl}
                  onChange={(value) => setForm((current) => ({ ...current, canonicalUrl: value }))}
                />
                <TextareaField
                  label="Description"
                  description={`${form.metaDescription.trim().length}/160 characters`}
                  value={form.metaDescription}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, metaDescription: value }))
                  }
                />
                <TextField
                  label="OpenGraph Image"
                  value={form.openGraphImageUrl}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, openGraphImageUrl: value }))
                  }
                />
              </div>
            </EditorCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <EditorCard title="Publishing">
              <div className="space-y-4">
                <SelectField
                  label="Publish Status"
                  value={form.status}
                  options={["DRAFT", "PUBLISHED"]}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                />
                <SelectField
                  label="Pricing"
                  value={form.pricingModel}
                  options={["FREE", "FREEMIUM", "PAID", "CONTACT"]}
                  onChange={(value) => setForm((current) => ({ ...current, pricingModel: value }))}
                />
              </div>
            </EditorCard>
            <EditorCard title="Tool Icon Preview">
              <div className="flex items-center gap-4">
                <ToolLogo
                  name={form.name || "AI Tool"}
                  logoUrl={form.logoUrl}
                  fallbackLogoUrl={form.collectedLogoUrl}
                  categoryIconUrl={primaryCategory?.iconUrl ?? null}
                  size="lg"
                />
                <div className="flex flex-wrap gap-2">
                  {mode === "edit" ? (
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void handleLogoPreview()}
                      disabled={isPreviewingLogo || isRefreshingLogo}
                    >
                      {isPreviewingLogo ? "Previewing..." : "Preview Logo"}
                    </button>
                  ) : null}
                  {mode === "edit" ? (
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void handleLogoRefresh()}
                      disabled={isPreviewingLogo || isRefreshingLogo}
                    >
                      {isRefreshingLogo ? "Queueing..." : "Refresh Logo"}
                    </button>
                  ) : null}
                </div>
              </div>
            </EditorCard>
            <EditorCard title="Overview">
              <div className="space-y-3 text-sm">
                <SidebarRow label="Created Time" value={formatDate(form.createdAt)} />
                <SidebarRow label="Updated Time" value={formatDate(form.updatedAt)} />
                <SidebarRow label="Author" value="Admin" />
                <SidebarRow label="SEO Score" value={`${seoScore}%`} />
                <SidebarRow label="Content Completeness" value={`${contentCompleteness}%`} />
              </div>
            </EditorCard>
          </aside>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                onClick={() => router.replace("/tools")}
                disabled={isSaving}
              >
                Cancel
              </button>
              <a
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Eye className="size-4" />
                Preview
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
                onClick={() => void submitTool("DRAFT")}
                disabled={isSaving}
              >
                <Save className="size-4" />
                Save Draft
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => void submitTool("PUBLISHED")}
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Publish
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  className = "",
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  description?: string;
}) {
  return (
    <label className={`space-y-2 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      <input
        required={required}
        className="w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className="w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditableStringListSection({
  title,
  description,
  items,
  placeholder,
  addLabel,
  onChange,
  onUpload,
  isUploading = false,
}: {
  title: string;
  description: string;
  items: string[];
  placeholder: string;
  addLabel: string;
  onChange: (items: string[]) => void;
  onUpload?: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  isUploading?: boolean;
}) {
  return (
    <EditorCard title={title}>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No items added.
          </p>
        ) : null}
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-lg border bg-muted/20 p-3">
            {title === "Screenshots" && item.trim() ? (
              <div className="mb-3 overflow-hidden rounded-md border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item}
                  alt={`Screenshot preview ${index + 1}`}
                  className="aspect-video w-full object-cover"
                />
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={item}
                placeholder={placeholder}
                onChange={(event) =>
                  onChange(
                    items.map((current, itemIndex) =>
                      itemIndex === index ? event.target.value : current,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`Remove ${title} ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => onChange([...items, ""])}
          >
            <Plus className="size-4" />
            {addLabel}
          </button>
          {onUpload ? (
            <UploadButton
              label={isUploading ? "Uploading..." : "Upload Screenshot"}
              isLoading={isUploading}
              onChange={onUpload}
            />
          ) : null}
        </div>
      </div>
    </EditorCard>
  );
}

function EditableFaqSection({
  items,
  onChange,
}: {
  items: Array<{ question: string; answer: string }>;
  onChange: (items: Array<{ question: string; answer: string }>) => void;
}) {
  return (
    <EditorCard title="FAQ">
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No FAQ entries.
          </p>
        ) : null}
        {items.map((item, index) => (
          <div key={`faq-${index}`} className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <TextField
              label="Question"
              value={item.question}
              onChange={(value) =>
                onChange(
                  items.map((current, itemIndex) =>
                    itemIndex === index ? { ...current, question: value } : current,
                  ),
                )
              }
            />
            <TextareaField
              label="Answer"
              value={item.answer}
              onChange={(value) =>
                onChange(
                  items.map((current, itemIndex) =>
                    itemIndex === index ? { ...current, answer: value } : current,
                  ),
                )
              }
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          onClick={() => onChange([...items, { question: "", answer: "" }])}
        >
          <Plus className="size-4" />
          Add FAQ
        </button>
      </div>
    </EditorCard>
  );
}

function UploadButton({
  label,
  isLoading,
  onChange,
  icon = "upload",
}: {
  label: string;
  isLoading: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  icon?: "upload" | "image";
}) {
  const Icon = icon === "image" ? ImagePlus : Upload;
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
      <span>{label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
        className="hidden"
        onChange={(event) => void onChange(event)}
        disabled={isLoading}
      />
    </label>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
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

function slugifyToolValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
