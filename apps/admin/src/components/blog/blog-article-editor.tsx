"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBlogArticle,
  fetchBlogArticleById,
  fetchBlogCategories,
  fetchBlogTags,
  getApiErrorMessage,
  updateBlogArticle,
  type ApiError,
  type BlogCategory,
  type BlogTag,
} from "@/lib/api";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  coverImageUrl: string;
  categoryId: string;
  tagIds: string[];
  scheduledAt: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "DRAFT",
  coverImageUrl: "",
  categoryId: "",
  tagIds: [],
  scheduledAt: "",
  metaTitle: "",
  metaDescription: "",
  ogImageUrl: "",
  canonicalUrl: "",
};

export function BlogArticleEditor({ mode, articleId }: { mode: "create" | "edit"; articleId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [categoryData, tagData, article] = await Promise.all([
          fetchBlogCategories(),
          fetchBlogTags(),
          mode === "edit" && articleId ? fetchBlogArticleById(articleId) : Promise.resolve(null),
        ]);
        setCategories(categoryData.items);
        setTags(tagData.items);
        if (article) {
          setForm({
            title: article.title ?? "",
            slug: article.slug ?? "",
            excerpt: article.excerpt ?? "",
            content: article.content ?? "",
            status: article.status ?? "DRAFT",
            coverImageUrl: article.coverImageUrl ?? "",
            categoryId: article.category?.id ?? "",
            tagIds: article.tags?.map((item) => item.tag.id) ?? [],
            scheduledAt: article.scheduledAt ? article.scheduledAt.slice(0, 16) : "",
            metaTitle: article.metaTitle ?? "",
            metaDescription: article.metaDescription ?? "",
            ogImageUrl: article.ogImageUrl ?? "",
            canonicalUrl: article.canonicalUrl ?? "",
          });
        }
        setError(null);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [articleId, mode]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tagId: string) {
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((id) => id !== tagId)
        : [...current.tagIds, tagId],
    }));
  }

  async function save(publishNow = false) {
    if (!form.title.trim() || !form.content.trim()) {
      setError({ status: 400, message: "Title and markdown content are required." });
      return;
    }
    setIsSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content,
      status: publishNow ? "PUBLISHED" : form.status,
      publishNow,
      coverImageUrl: form.coverImageUrl.trim() || undefined,
      categoryId: form.categoryId || null,
      tagIds: form.tagIds,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      ogImageUrl: form.ogImageUrl.trim() || undefined,
      canonicalUrl: form.canonicalUrl.trim() || undefined,
    };
    try {
      if (mode === "edit" && articleId) await updateBlogArticle(articleId, payload);
      else await createBlogArticle(payload);
      router.replace("/blog?success=1");
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading article editor...</p>;

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">API error {error.status}: {getApiErrorMessage(error)}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Article</h2>
          <Input label="Title" value={form.title} onChange={(value) => setField("title", value)} />
          <Input label="Slug" value={form.slug} onChange={(value) => setField("slug", value)} />
          <Textarea label="Excerpt" value={form.excerpt} onChange={(value) => setField("excerpt", value)} rows={3} />
          <Textarea label="Markdown" value={form.content} onChange={(value) => setField("content", value)} rows={18} />
          <Input label="Cover Image URL" value={form.coverImageUrl} onChange={(value) => setField("coverImageUrl", value)} />
          {form.coverImageUrl ? <img src={form.coverImageUrl} alt="Cover preview" className="max-h-56 rounded-lg border object-cover" /> : null}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Publishing</h2>
            <label className="mt-4 block text-sm font-medium">Status</label>
            <select className="mt-2 w-full rounded-md border bg-background px-3 py-2" value={form.status} onChange={(event) => setField("status", event.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Input label="Schedule" type="datetime-local" value={form.scheduledAt} onChange={(value) => setField("scheduledAt", value)} />
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Taxonomy</h2>
            <label className="mt-4 block text-sm font-medium">Category</label>
            <select className="mt-2 w-full rounded-md border bg-background px-3 py-2" value={form.categoryId} onChange={(event) => setField("categoryId", event.target.value)}>
              <option value="">None</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button key={tag.id} type="button" className={`rounded-full border px-3 py-1 text-xs ${form.tagIds.includes(tag.id) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => toggleTag(tag.id)}>
                  {tag.name}
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">SEO</h2>
            <Input label="SEO Title" value={form.metaTitle} onChange={(value) => setField("metaTitle", value)} />
            <Textarea label="SEO Description" value={form.metaDescription} onChange={(value) => setField("metaDescription", value)} rows={3} />
            <Input label="Canonical URL" value={form.canonicalUrl} onChange={(value) => setField("canonicalUrl", value)} />
            <Input label="OpenGraph Image" value={form.ogImageUrl} onChange={(value) => setField("ogImageUrl", value)} />
          </section>
        </aside>
      </div>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t bg-background/95 p-4 backdrop-blur">
        <Link href="/blog" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</Link>
        <button type="button" className="rounded-md border px-4 py-2 text-sm hover:bg-muted" disabled={isSaving} onClick={() => void save(false)}>{isSaving ? "Saving..." : "Save Draft"}</button>
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" disabled={isSaving} onClick={() => void save(true)}>Publish</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block space-y-2 text-sm"><span className="font-medium">{label}</span><input type={type} className="w-full rounded-md border bg-background px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Textarea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return <label className="block space-y-2 text-sm"><span className="font-medium">{label}</span><textarea rows={rows} className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}