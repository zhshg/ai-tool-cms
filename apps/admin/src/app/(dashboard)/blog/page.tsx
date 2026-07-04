"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  createBlogCategory,
  createBlogTag,
  deleteBlogArticle,
  deleteBlogCategory,
  deleteBlogTag,
  fetchBlogArticles,
  fetchBlogCategories,
  fetchBlogTags,
  getApiErrorMessage,
  type ApiError,
  type BlogArticle,
  type BlogCategory,
  type BlogTag,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function BlogAdminPage() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const [articleData, categoryData, tagData] = await Promise.all([
        fetchBlogArticles(),
        fetchBlogCategories(),
        fetchBlogTags(),
      ]);
      setArticles(articleData.items);
      setCategories(categoryData.items);
      setTags(tagData.items);
      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addCategory() {
    if (!categoryName.trim()) return;
    await createBlogCategory({ name: categoryName.trim() });
    setCategoryName("");
    await load();
  }

  async function addTag() {
    if (!tagName.trim()) return;
    await createBlogTag({ name: tagName.trim() });
    setTagName("");
    await load();
  }

  async function removeArticle(article: BlogArticle) {
    if (!window.confirm(`Delete article "${article.title}"?`)) return;
    await deleteBlogArticle(article.id);
    await load();
  }

  async function removeCategory(category: BlogCategory) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    await deleteBlogCategory(category.id);
    await load();
  }

  async function removeTag(tag: BlogTag) {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
    await deleteBlogTag(tag.id);
    await load();
  }

  return (
    <RequirePermission permission={Permission.SeoRead}>
      <div className="space-y-6">
        <PageHeader title="Blog CMS" description="Manage articles, categories, tags, publishing, Markdown, cover images, and SEO." />

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Articles" value={articles.length} />
          <Stat label="Draft" value={articles.filter((item) => item.status === "DRAFT").length} />
          <Stat label="Published" value={articles.filter((item) => item.status === "PUBLISHED").length} />
          <Stat label="Scheduled" value={articles.filter((item) => item.status === "SCHEDULED").length} />
        </div>

        {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">API error {error.status}: {getApiErrorMessage(error)}</div> : null}

        <div className="flex justify-end">
          <Link href="/blog/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">New Article</Link>
        </div>

        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b px-6 py-4"><h2 className="font-semibold">Articles</h2></div>
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading blog content...</p> : null}
          {!isLoading && articles.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No articles yet.</p> : null}
          {articles.length ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{article.title}<div className="text-xs text-muted-foreground">/{article.slug}</div></td>
                    <td className="px-4 py-3 text-muted-foreground">{article.category?.name ?? "None"}</td>
                    <td className="px-4 py-3">{article.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><a href={`/en/blog/${article.slug}`} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 text-xs hover:bg-muted">View</a><Link href={`/blog/${article.id}/edit`} className="rounded-md border px-3 py-2 text-xs hover:bg-muted">Edit</Link><button type="button" className="rounded-md border px-3 py-2 text-xs hover:bg-muted" onClick={() => void removeArticle(article)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <TaxonomyPanel title="Categories" value={categoryName} onChange={setCategoryName} onAdd={() => void addCategory()} items={categories} onRemove={(item) => void removeCategory(item)} />
          <TaxonomyPanel title="Tags" value={tagName} onChange={setTagName} onAdd={() => void addTag()} items={tags} onRemove={(item) => void removeTag(item)} />
        </div>
      </div>
    </RequirePermission>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-card p-4 shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function TaxonomyPanel<T extends { id: string; name: string; slug: string }>({ title, value, onChange, onAdd, items, onRemove }: { title: string; value: string; onChange: (value: string) => void; onAdd: () => void; items: T[]; onRemove: (item: T) => void }) {
  return <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} placeholder={`New ${title.toLowerCase()}`} /><button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={onAdd}>Add</button></div><div className="mt-4 flex flex-wrap gap-2">{items.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">{item.name}<button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(item)}>¡Á</button></span>)}</div></section>;
}