import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ToolStatus, prisma } from "@ai-tool-cms/database";
import { buildBreadcrumbJsonLd, buildItemListJsonLd, buildMetadata, getSiteConfig, joinUrl } from "@ai-tool-cms/seo";
import { serializeJsonLd } from "@/lib/seo";

const activeOnly = { deletedAt: null } as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === "zh";
  const config = getSiteConfig();
  return buildMetadata({ title: isZh ? "AI 工具目录博客" : "AI Tool Directory Blog", description: isZh ? "阅读 AI 工具目录的导购、对比、发布复盘与运营经验。" : "Read AI tool directory guides, comparisons, launch notes, and operational lessons.", path: `/${locale}/blog`, hreflang: config.locales.map((loc) => ({ locale: loc, path: `/${loc}/blog` })), ogType: "article" }, config) as Metadata;
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const config = getSiteConfig();
  const posts = await prisma.blogArticle.findMany({
    where: { ...activeOnly, status: ToolStatus.PUBLISHED, OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
    include: { category: true, tags: { where: activeOnly, include: { tag: true } } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 24,
  });
  const path = `/${locale}/blog`;
  const jsonLd = [buildItemListJsonLd({ name: "AI Tool Directory Blog", url: joinUrl(config.siteUrl, path), items: posts.map((post, index) => ({ name: post.title, url: joinUrl(config.siteUrl, `/${locale}/blog/${post.slug}`), position: index + 1 })) }), buildBreadcrumbJsonLd([{ name: "Home", path: `/${locale}` }, { name: "Blog", path }], config.siteUrl)];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <section className="border-b bg-white"><div className="mx-auto max-w-6xl px-6 py-12 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Blog</p><h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">AI Tool Directory Blog</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Guides, launch notes, comparisons, and operating lessons for choosing AI tools.</p><Link href="/feed/rss" className="mt-6 inline-flex rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50">RSS Feed</Link></div></section>
      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {posts.length ? <div className="grid gap-5 md:grid-cols-2">{posts.map((post) => <article key={post.id} className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="mb-5 aspect-video w-full rounded-2xl object-cover" /> : null}<div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale) : "Published"}</span>{post.category ? <span>· {post.category.name}</span> : null}</div><h2 className="mt-3 text-2xl font-semibold"><Link href={`/${locale}/blog/${post.slug}`} className="hover:text-blue-700">{post.title}</Link></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt ?? stripMarkdown(post.content).slice(0, 180)}</p><div className="mt-4 flex flex-wrap gap-2">{post.tags.slice(0, 3).map((item) => <span key={item.tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{item.tag.name}</span>)}</div></article>)}</div> : <div className="rounded-3xl border bg-white p-8 text-sm text-slate-600">No published blog articles yet.</div>}
      </section>
    </main>
  );
}

function stripMarkdown(value: string) { return value.replace(/[#*_`>\-[\]()]/g, " ").replace(/\s+/g, " ").trim(); }