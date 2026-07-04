import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ToolStatus, prisma } from "@ai-tool-cms/database";
import { buildBreadcrumbJsonLd, buildMetadata, getSiteConfig } from "@ai-tool-cms/seo";
import { serializeJsonLd } from "@/lib/seo";

const activeOnly = { deletedAt: null } as const;

async function getPost(slug: string) {
  return prisma.blogArticle.findFirst({
    where: { slug, ...activeOnly, status: ToolStatus.PUBLISHED, OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
    include: { category: true, author: { select: { displayName: true, email: true } }, tags: { where: activeOnly, include: { tag: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return buildMetadata({ title: post.metaTitle ?? post.title, description: post.metaDescription ?? post.excerpt ?? stripMarkdown(post.content).slice(0, 155), path: `/${locale}/blog/${post.slug}`, ogType: "article", ogImage: post.ogImageUrl ?? post.coverImageUrl ?? undefined }) as Metadata;
}

export default async function BlogArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getPost(slug);
  if (!post) notFound();
  const tagIds = post.tags.map((item) => item.tagId);
  const related = await prisma.blogArticle.findMany({ where: { ...activeOnly, status: ToolStatus.PUBLISHED, id: { not: post.id }, OR: [{ categoryId: post.categoryId }, ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds }, ...activeOnly } } }] : [])] }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 4 });
  const config = getSiteConfig();
  const path = `/${locale}/blog/${post.slug}`;
  const jsonLd = [buildBreadcrumbJsonLd([{ name: "Home", path: `/${locale}` }, { name: "Blog", path: `/${locale}/blog` }, { name: post.title, path }], config.siteUrl)];

  return <main className="min-h-screen bg-slate-50 text-slate-950"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} /><article className="mx-auto max-w-3xl px-6 py-12 lg:px-8"><nav className="text-sm text-slate-500"><Link href={`/${locale}/blog`} className="hover:text-slate-900">Blog</Link> / <span>{post.title}</span></nav>{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="mt-8 aspect-video w-full rounded-3xl object-cover shadow-sm" /> : null}<p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{post.category?.name ?? "Article"}</p><h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{post.title}</h1><p className="mt-4 text-slate-600">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale) : "Published"}{post.author?.displayName ? ` ¡¤ ${post.author.displayName}` : ""}</p>{post.excerpt ? <p className="mt-6 text-xl leading-8 text-slate-600">{post.excerpt}</p> : null}<div className="prose prose-slate mt-10 max-w-none rounded-3xl border bg-white p-8 shadow-sm">{renderMarkdown(post.content)}</div><div className="mt-8 flex flex-wrap gap-2">{post.tags.map((item) => <span key={item.tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{item.tag.name}</span>)}</div></article><section className="mx-auto max-w-5xl px-6 pb-12 lg:px-8"><h2 className="text-2xl font-bold">Related Posts</h2>{related.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{related.map((item) => <Link key={item.id} href={`/${locale}/blog/${item.slug}`} className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-slate-50"><span className="font-semibold">{item.title}</span><span className="mt-2 line-clamp-2 block text-sm text-slate-600">{item.excerpt ?? stripMarkdown(item.content).slice(0, 120)}</span></Link>)}</div> : <p className="mt-3 text-sm text-slate-600">No related posts yet.</p>}</section></main>;
}

function stripMarkdown(value: string) { return value.replace(/[#*_`>\-[\]()]/g, " ").replace(/\s+/g, " ").trim(); }
function renderMarkdown(value: string) { return value.split(/\n{2,}/).map((block, index) => { const text = block.trim(); if (!text) return null; if (text.startsWith("### ")) return <h3 key={index}>{text.slice(4)}</h3>; if (text.startsWith("## ")) return <h2 key={index}>{text.slice(3)}</h2>; if (text.startsWith("# ")) return <h1 key={index}>{text.slice(2)}</h1>; if (text.startsWith("- ")) return <ul key={index}>{text.split("\n").map((line) => <li key={line}>{line.replace(/^-\s*/, "")}</li>)}</ul>; return <p key={index}>{text}</p>; }); }