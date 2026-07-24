"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBlogArticle,
  fetchBlogArticleById,
  fetchBlogCategories,
  fetchBlogTags,
  getApiErrorMessage,
  searchTools,
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

export function BlogArticleEditor({
  mode,
  articleId,
}: {
  mode: "create" | "edit";
  articleId?: string;
}) {
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
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          API error {error.status}: {getApiErrorMessage(error)}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Article</h2>
          <Input label="Title" value={form.title} onChange={(value) => setField("title", value)} />
          <Input label="Slug" value={form.slug} onChange={(value) => setField("slug", value)} />
          <Textarea
            label="Excerpt"
            value={form.excerpt}
            onChange={(value) => setField("excerpt", value)}
            rows={3}
          />
          <MarkdownEditor value={form.content} onChange={(value) => setField("content", value)} />
          <Input
            label="Cover Image URL"
            value={form.coverImageUrl}
            onChange={(value) => setField("coverImageUrl", value)}
          />
          {form.coverImageUrl ? (
            <img
              src={form.coverImageUrl}
              alt="Cover preview"
              className="max-h-56 rounded-lg border object-cover"
            />
          ) : null}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Publishing</h2>
            <label className="mt-4 block text-sm font-medium">Status</label>
            <select
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              value={form.status}
              onChange={(event) => setField("status", event.target.value)}
            >
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Input
              label="Schedule"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(value) => setField("scheduledAt", value)}
            />
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Taxonomy</h2>
            <label className="mt-4 block text-sm font-medium">Category</label>
            <select
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              value={form.categoryId}
              onChange={(event) => setField("categoryId", event.target.value)}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs ${form.tagIds.includes(tag.id) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">SEO</h2>
            <Input
              label="SEO Title"
              value={form.metaTitle}
              onChange={(value) => setField("metaTitle", value)}
            />
            <Textarea
              label="SEO Description"
              value={form.metaDescription}
              onChange={(value) => setField("metaDescription", value)}
              rows={3}
            />
            <Input
              label="Canonical URL"
              value={form.canonicalUrl}
              onChange={(value) => setField("canonicalUrl", value)}
            />
            <Input
              label="OpenGraph Image"
              value={form.ogImageUrl}
              onChange={(value) => setField("ogImageUrl", value)}
            />
          </section>
        </aside>
      </div>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t bg-background/95 p-4 backdrop-blur">
        <Link href="/blog" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
          Cancel
        </Link>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          disabled={isSaving}
          onClick={() => void save(false)}
        >
          {isSaving ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          disabled={isSaving}
          onClick={() => void save(true)}
        >
          Publish
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
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
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        rows={rows}
        className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type EditorMode = "write" | "preview";

function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<EditorMode>("write");
  const [toolQuery, setToolQuery] = useState("");
  const [toolResults, setToolResults] = useState<Array<{ name: string; slug: string }>>([]);
  const [isSearchingTools, setIsSearchingTools] = useState(false);
  const [toolSearchError, setToolSearchError] = useState("");

  function insertMarkdown(before: string, after = "", placeholder = "text") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + before.length;
      textarea.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  }

  function insertLine(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextValue = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  async function findTools() {
    const query = toolQuery.trim();
    if (!query) {
      setToolResults([]);
      return;
    }
    setIsSearchingTools(true);
    setToolSearchError("");
    try {
      const response = await searchTools(query);
      setToolResults(response.items.map((tool) => ({ name: tool.name, slug: tool.slug })));
    } catch {
      setToolResults([]);
      setToolSearchError("工具搜索失败，请稍后重试。");
    } finally {
      setIsSearchingTools(false);
    }
  }

  function insertToolLink(tool: { name: string; slug: string }) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end).trim();
    const label = selected || tool.name;
    const link = `[${label}](/en/tools/${tool.slug})`;
    onChange(`${value.slice(0, start)}${link}${value.slice(end)}`);
    setToolQuery("");
    setToolResults([]);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + link.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-medium">Content Editor</span>
          <p className="text-xs text-muted-foreground">Markdown is preserved when saved.</p>
        </div>
        <div className="flex rounded-md border p-1">
          {(["write", "preview"] as EditorMode[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded px-3 py-1 text-xs ${mode === item ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setMode(item)}
            >
              {item === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {mode === "write" ? (
        <>
          <div className="flex flex-wrap gap-1 rounded-md border bg-muted/30 p-2">
            <EditorButton label="H2" onClick={() => insertLine("## ")} />
            <EditorButton label="H3" onClick={() => insertLine("### ")} />
            <EditorButton label="Bold" onClick={() => insertMarkdown("**", "**", "bold text")} />
            <EditorButton label="Italic" onClick={() => insertMarkdown("*", "*", "italic text")} />
            <EditorButton
              label="Link"
              onClick={() => insertMarkdown("[", "](https://)", "link text")}
            />
            <EditorButton
              label="Tool Link"
              onClick={() => insertMarkdown("[", "](/en/tools/tool-slug)", "Tool Name")}
            />
            <EditorButton label="List" onClick={() => insertLine("- ")} />
            <EditorButton label="Quote" onClick={() => insertLine("> ")} />
            <EditorButton label="Code" onClick={() => insertMarkdown("`", "`", "code")} />
          </div>
          <div className="space-y-2 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                value={toolQuery}
                onChange={(event) => setToolQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void findTools();
                  }
                }}
                placeholder="搜索工具并插入内链，例如 Notion AI"
              />
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => void findTools()}
                disabled={isSearchingTools}
              >
                {isSearchingTools ? "搜索中..." : "搜索工具"}
              </button>
            </div>
            {toolSearchError ? <p className="text-xs text-destructive">{toolSearchError}</p> : null}
            {toolResults.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {toolResults.map((tool) => (
                  <button
                    key={tool.slug}
                    type="button"
                    className="rounded-md border px-3 py-2 text-left text-sm hover:border-primary hover:bg-muted"
                    onClick={() => insertToolLink(tool)}
                  >
                    <span className="block font-medium">{tool.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      /en/tools/{tool.slug}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              选中文章中的文字后点击结果，会保留选中文字作为链接标题；未选中时使用工具名称。
            </p>
          </div>
          <textarea
            ref={textareaRef}
            rows={20}
            className="w-full rounded-md border bg-background px-3 py-3 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Write your article in Markdown..."
          />
          <p className="text-xs text-muted-foreground">
            Tip: select text before using a toolbar button. Use Tool Link for links such as
            <code className="ml-1 rounded bg-muted px-1">[Tool Name](/en/tools/tool-slug)</code>.
          </p>
        </>
      ) : (
        <MarkdownPreview value={value} />
      )}
    </div>
  );
}

function EditorButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MarkdownPreview({ value }: { value: string }) {
  const html = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[([^\]]+)\]\((\/en\/tools\/[^)]+|https?:\/\/[^)]+)\)/g, (_match, label, href) => {
      const safeHref =
        /^\/en\/tools\/[a-z0-9-]+$/i.test(href) || /^https?:\/\//i.test(href) ? href : "#";
      return `<a href="${safeHref.replace(/"/g, "&quot;")}" class="text-primary underline">${label}</a>`;
    })
    .replace(/^### (.+)$/gim, "<h3>$1</h3>")
    .replace(/^## (.+)$/gim, "<h2>$1</h2>")
    .replace(/^# (.+)$/gim, "<h1>$1</h1>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gim, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return (
    <div className="min-h-[31rem] rounded-md border bg-background p-5">
      <div
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
      />
    </div>
  );
}
