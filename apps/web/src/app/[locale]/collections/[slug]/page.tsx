import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ToolStatus, prisma } from "@ai-tool-cms/database";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildMetadata,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

import { ToolLogo } from "@/components/tool/tool-logo";
import { serializeJsonLd } from "@/lib/seo";

const activeOnly = { deletedAt: null } as const;

type CollectionMetadata = {
  featured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  heroIntro?: string;
  seoSummary?: string;
};

type CollectionTool = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  website: string;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  pricingModel: string;
  note: string | null;
  categories: Array<{ slug: string; name: string; iconUrl: string | null }>;
  tags: Array<{ slug: string; name: string }>;
};

async function getPublicCollection(slug: string, locale: string) {
  const collection = await prisma.collection.findFirst({
    where: { slug, isPublic: true, ...activeOnly },
    include: {
      items: {
        where: activeOnly,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          tool: {
            select: {
              id: true,
              slug: true,
              name: true,
              summary: true,
              website: true,
              logoUrl: true,
              pricingModel: true,
              status: true,
              metadata: true,
              categories: {
                where: activeOnly,
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                select: {
                  category: { select: { slug: true, name: true, iconUrl: true } },
                },
              },
              tags: {
                where: activeOnly,
                orderBy: { createdAt: "asc" },
                select: { tag: { select: { slug: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!collection) return null;

  const metadata = normalizeCollectionMetadata(collection.metadata);
  const tools = collection.items
    .filter((item) => item.tool.status === ToolStatus.PUBLISHED)
    .map((item): CollectionTool => {
      const toolMetadata = normalizeToolMetadata(item.tool.metadata);
      const categories = item.tool.categories.map((link) => link.category);
      return {
        id: item.tool.id,
        slug: item.tool.slug,
        name: item.tool.name,
        summary: item.tool.summary,
        website: item.tool.website,
        logoUrl: item.tool.logoUrl,
        collectedLogoUrl: resolveCollectedLogoUrl(item.tool.logoUrl, toolMetadata),
        pricingModel: item.tool.pricingModel,
        note: item.note,
        categories,
        tags: item.tool.tags.map((link) => link.tag),
      };
    });

  const relatedCollections = await prisma.collection.findMany({
    where: { slug: { not: slug }, isPublic: true, ...activeOnly },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 4,
    select: { slug: true, name: true, description: true, metadata: true },
  });

  const config = getSiteConfig();
  const path = `/${locale}/collections/${collection.slug}`;
  const url = joinUrl(config.siteUrl, path);
  const description =
    metadata.metaDescription ??
    collection.description ??
    `Browse curated AI tools in ${collection.name}.`;
  const title = metadata.metaTitle ?? `${collection.name} AI Tools`;
  const jsonLd = [
    buildCollectionPageJsonLd({
      name: collection.name,
      url,
      description,
      items: tools.map((tool) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
        description: tool.summary ?? undefined,
      })),
    }),
    buildItemListJsonLd({
      name: collection.name,
      url,
      items: tools.map((tool, index) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
        position: index + 1,
      })),
    }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: "Collections", path: `/${locale}/collections` },
        { name: collection.name, path },
      ],
      config.siteUrl,
    ),
  ];

  return {
    collection: {
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      updatedAt: collection.updatedAt,
      metadata,
    },
    tools,
    relatedCollections: relatedCollections.map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.description,
      featured: Boolean(normalizeCollectionMetadata(item.metadata).featured),
    })),
    metadata: buildMetadata({
      title,
      description,
      path,
      keywords: ["AI tools", "AI directory", collection.name, "curated AI tools"],
    }),
    jsonLd,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const landing = await getPublicCollection(slug, locale);
  if (!landing) return {};
  return landing.metadata as Metadata;
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const landing = await getPublicCollection(slug, locale);
  if (!landing) notFound();

  const { collection, tools, relatedCollections, jsonLd } = landing;
  const heroIntro = collection.metadata.heroIntro ?? collection.description;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <nav className="flex flex-wrap gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href={`/${locale}`} className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href={`/${locale}/collections`} className="hover:text-slate-900">
              Collections
            </Link>
            <span>/</span>
            <span className="text-slate-900">{collection.name}</span>
          </nav>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {collection.metadata.featured ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Featured Collection
                </span>
              ) : null}
              <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
                {collection.name}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {heroIntro ??
                  `A curated collection of ${tools.length} AI tools for discovery and comparison.`}
              </p>
            </div>
            <aside className="rounded-3xl border bg-slate-950 p-6 text-white shadow-xl">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Collection Snapshot
              </p>
              <dl className="mt-6 space-y-4">
                <div>
                  <dt className="text-sm text-slate-400">Tools</dt>
                  <dd className="text-3xl font-bold">{tools.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-400">Updated</dt>
                  <dd className="font-medium">{formatDate(collection.updatedAt, locale)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Curated Tools
              </p>
              <h2 className="mt-2 text-2xl font-bold">Tools in this collection</h2>
            </div>
          </div>

          {tools.length ? (
            <div className="grid gap-4">
              {tools.map((tool, index) => (
                <article
                  key={tool.id}
                  className="rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <ToolLogo
                        name={tool.name}
                        logoUrl={tool.logoUrl}
                        fallbackLogoUrl={tool.collectedLogoUrl}
                        categoryIconUrl={tool.categories[0]?.iconUrl ?? null}
                        size="md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            #{index + 1}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {formatPricing(tool.pricingModel)}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-slate-950">
                          <Link
                            href={`/${locale}/tools/${tool.slug}`}
                            className="hover:text-blue-700"
                          >
                            {tool.name}
                          </Link>
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                          {tool.summary ?? tool.note ?? "No summary is available yet."}
                        </p>
                        {tool.note ? (
                          <p className="mt-2 text-sm font-medium text-slate-700">
                            Editor note: {tool.note}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tool.categories.slice(0, 2).map((category) => (
                            <Link
                              key={category.slug}
                              href={`/${locale}/category/${category.slug}`}
                              className="rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              {category.name}
                            </Link>
                          ))}
                          {tool.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.slug}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 md:flex-col">
                      <Link
                        href={`/${locale}/tools/${tool.slug}`}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        View Tool
                      </Link>
                      <a
                        href={tool.website}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Website
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border bg-white p-8 text-sm text-slate-600">
              This public collection does not have published tools yet.
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {collection.metadata.seoSummary ? (
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Guide Summary</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {collection.metadata.seoSummary}
              </p>
            </section>
          ) : null}
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Related Collections</h2>
            <div className="mt-4 space-y-3">
              {relatedCollections.length ? (
                relatedCollections.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/${locale}/collections/${related.slug}`}
                    className="block rounded-2xl border p-4 hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-950">{related.name}</span>
                    {related.featured ? (
                      <span className="ml-2 text-xs font-semibold text-emerald-700">Featured</span>
                    ) : null}
                    <span className="mt-1 line-clamp-2 block text-sm text-slate-600">
                      {related.description ?? "Open this curated collection."}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-600">No related collections yet.</p>
              )}
            </div>
          </section>
          <Link
            href={`/${locale}/tools`}
            className="block rounded-3xl border bg-white p-6 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Browse all AI tools
          </Link>
        </aside>
      </section>
    </main>
  );
}

function normalizeCollectionMetadata(value: unknown): CollectionMetadata {
  return value && typeof value === "object" ? (value as CollectionMetadata) : {};
}

function normalizeToolMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function resolveCollectedLogoUrl(primaryLogoUrl: string | null, metadata: Record<string, unknown>) {
  const candidates = [
    metadata.logoUrl,
    metadata.logo,
    metadata.collectedLogoUrl,
    metadata.faviconUrl,
    metadata.appleTouchIconUrl,
    metadata.openGraphImageUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() && candidate !== primaryLogoUrl) {
      return candidate.trim();
    }
  }

  return null;
}

function formatPricing(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}
