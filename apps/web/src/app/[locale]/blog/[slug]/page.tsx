import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Tag, Calendar, User, ArrowLeft, ChevronRight } from "lucide-react";
import { ToolStatus, prisma } from "@ai-tool-cms/database";
import { buildBreadcrumbJsonLd, buildMetadata, getSiteConfig } from "@ai-tool-cms/seo";
import { serializeJsonLd } from "@/lib/seo";

const activeOnly = { deletedAt: null } as const;

async function getPost(slug: string) {
  try {
    return await prisma.blogArticle.findFirst({
      where: {
        slug,
        ...activeOnly,
        status: ToolStatus.PUBLISHED,
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      },
      include: {
        category: true,
        author: { select: { displayName: true, email: true } },
        tags: { where: activeOnly, include: { tag: true } },
      },
    });
  } catch (error) {
    if (isMissingBlogTable(error)) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return buildMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? stripMarkdown(post.content).slice(0, 155),
    path: `/${locale}/blog/${post.slug}`,
    ogType: "article",
    ogImage: post.ogImageUrl ?? post.coverImageUrl ?? undefined,
  }) as Metadata;
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isZh = locale.startsWith("zh");
  setRequestLocale(locale);
  const post = await getPost(slug);
  if (!post) notFound();
  const tagIds = post.tags.map((item) => item.tagId);
  const related = await fetchRelatedPosts(post.id, post.categoryId, tagIds);
  const config = getSiteConfig();
  const path = `/${locale}/blog/${post.slug}`;
  const jsonLd = [
    buildBreadcrumbJsonLd(
      [
        { name: isZh ? "首页" : "Home", path: `/${locale}` },
        { name: isZh ? "博客" : "Blog", path: `/${locale}/blog` },
        { name: post.title, path },
      ],
      config.siteUrl,
    ),
  ];

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <nav className="border-b border-slate-200/60 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3 text-sm">
          <Link
            href={`/${locale}`}
            className="text-slate-400 transition-colors hover:text-emerald-600"
          >
            {isZh ? "首页" : "Home"}
          </Link>
          <ChevronRight className="size-3.5 text-slate-300" />
          <Link
            href={`/${locale}/blog`}
            className="text-slate-400 transition-colors hover:text-emerald-600"
          >
            {isZh ? "博客" : "Blog"}
          </Link>
          {post.category ? (
            <>
              <ChevronRight className="size-3.5 text-slate-300" />
              <Link
                href={`/${locale}/category/${post.category.slug}`}
                className="text-slate-400 transition-colors hover:text-emerald-600"
              >
                {post.category.name}
              </Link>
            </>
          ) : null}
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="font-medium text-slate-700">{post.title}</span>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-blog">
        <div className="relative mx-auto max-w-5xl px-6 pb-9 pt-8 lg:pt-10">
          <div className="flex flex-col items-center text-center">
            {post.category ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                {post.category.name}
              </span>
            ) : null}

            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString(isZh ? "zh-CN" : locale)
                  : isZh
                    ? "发布于"
                    : "Published"}
              </span>
              {post.author?.displayName ? (
                <span className="flex items-center gap-1.5">
                  <User className="size-4" />
                  {post.author.displayName}
                </span>
              ) : null}
            </div>

            {post.excerpt ? (
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">{post.excerpt}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/blog`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
              >
                <ArrowLeft className="size-4" />
                {isZh ? "返回博客" : "Back to blog"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 lg:py-14">
        <div className="space-y-14">
          {post.coverImageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-soft-sm">
              <img
                src={post.coverImageUrl}
                alt={`${post.title} cover`}
                className="aspect-video w-full rounded-xl object-cover"
              />
            </div>
          ) : null}

          <div>
            <SectionEyebrow>{isZh ? "文章" : "Article"}</SectionEyebrow>
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft-sm">
              <div className="prose prose-slate max-w-none text-base leading-[1.85] text-slate-600">
                {renderMarkdown(post.content, locale)}
              </div>
            </div>
          </div>

          <div>
            <SectionEyebrow>{isZh ? "标签" : "Tags"}</SectionEyebrow>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((item) => (
                <Link
                  key={item.tag.id}
                  href={`/${locale}/tag/${item.tag.slug}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Tag className="size-3" />
                  {item.tag.name}
                </Link>
              ))}
            </div>
          </div>

          {related.length ? (
            <div>
              <div className="flex items-end justify-between">
                <SectionEyebrow>{isZh ? "相关文章" : "Related Posts"}</SectionEyebrow>
                <Link
                  href={`/${locale}/blog`}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {isZh ? "查看全部" : "View all"}
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${locale}/blog/${item.slug}`}
                    className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-soft"
                  >
                    <div>
                      {item.category ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {item.category.name}
                        </span>
                      ) : null}
                      <h3 className="mt-3 text-base font-semibold text-slate-950 group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500 line-clamp-2">
                        {item.excerpt ?? stripMarkdown(item.content).slice(0, 120)}
                      </p>
                      <p className="mt-3 text-xs text-slate-400">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString(isZh ? "zh-CN" : locale)
                          : isZh
                            ? "发布于"
                            : "Published"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-slate-200/60 bg-gradient-soft">
        <div className="mx-auto max-w-5xl px-6 py-10 text-center">
          <p className="text-sm font-medium text-emerald-600">
            {isZh ? "想要更多文章？" : "Want more articles?"}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {isZh ? "浏览所有博客文章" : "Browse all blog posts"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {isZh
              ? "获取最新的 AI 工具评测、指南和行业洞察。"
              : "Stay updated with the latest AI tool reviews, guides, and industry insights."}
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600 shadow-sm"
            >
              {isZh ? "阅读更多文章" : "Read more articles"}
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">{children}</p>
  );
}

function stripMarkdown(value: string) {
  return value
    .replace(/[#*_`>\-[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInlineMarkdown(value: string, locale: string) {
  const parts: React.ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((\/[a-z]{2}(?:-[A-Z]{2})?\/[^)]+|\/[^)]+)\)/gu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(value))) {
    if (match.index > lastIndex) {
      parts.push(value.slice(lastIndex, match.index));
    }

    const href = match[2].startsWith(`/${locale}/`)
      ? match[2]
      : match[2].replace(/^\/(?:en|zh)\//u, `/${locale}/`);
    parts.push(
      <Link key={`${href}-${match.index}`} href={href} className="font-medium text-emerald-600">
        {match[1]}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return parts.length ? parts : value;
}

function renderMarkdown(value: string, locale: string) {
  return value.split(/\n{2,}/).map((block, index) => {
    const text = block.trim();
    if (!text) return null;
    if (text.startsWith("### "))
      return (
        <h3 key={index} className="mt-8 mb-4 text-lg font-semibold text-slate-900">
          {renderInlineMarkdown(text.slice(4), locale)}
        </h3>
      );
    if (text.startsWith("## "))
      return (
        <h2 key={index} className="mt-10 mb-4 text-xl font-bold text-slate-950">
          {renderInlineMarkdown(text.slice(3), locale)}
        </h2>
      );
    if (text.startsWith("# "))
      return (
        <h1 key={index} className="mt-12 mb-4 text-2xl font-bold text-slate-950">
          {renderInlineMarkdown(text.slice(2), locale)}
        </h1>
      );
    if (text.startsWith("- "))
      return (
        <ul key={index} className="mt-4 space-y-2 list-disc pl-5">
          {text.split("\n").map((line) => (
            <li key={line} className="text-slate-600">
              {renderInlineMarkdown(line.replace(/^-\s*/, ""), locale)}
            </li>
          ))}
        </ul>
      );
    return (
      <p key={index} className="mt-4">
        {renderInlineMarkdown(text, locale)}
      </p>
    );
  });
}

async function fetchRelatedPosts(postId: string, categoryId: string | null, tagIds: string[]) {
  try {
    return await prisma.blogArticle.findMany({
      where: {
        ...activeOnly,
        status: ToolStatus.PUBLISHED,
        id: { not: postId },
        OR: [
          { categoryId },
          ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds }, ...activeOnly } } }] : []),
        ],
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: { category: true },
    });
  } catch (error) {
    if (isMissingBlogTable(error)) return [];
    throw error;
  }
}

function isMissingBlogTable(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2021";
}
