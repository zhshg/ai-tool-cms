import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@ai-tool-cms/database";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildMetadata,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

import { serializeJsonLd } from "@/lib/seo";

const activeOnly = { deletedAt: null } as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "AI Tool Collections",
    description:
      "Browse curated AI tool collections selected for common workflows, categories, and buying journeys.",
    path: `/${locale}/collections`,
    keywords: ["AI tool collections", "best AI tools", "AI directory"],
  }) as Metadata;
}

export default async function CollectionsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const collections = await prisma.collection.findMany({
    where: { isPublic: true, ...activeOnly },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 48,
    select: {
      slug: true,
      name: true,
      description: true,
      metadata: true,
      _count: { select: { items: true } },
    },
  });

  const config = getSiteConfig();
  const path = `/${locale}/collections`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: "AI Tool Collections",
      url,
      items: collections.map((collection, index) => ({
        name: collection.name,
        url: joinUrl(config.siteUrl, `/${locale}/collections/${collection.slug}`),
        position: index + 1,
      })),
    }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: "Collections", path },
      ],
      config.siteUrl,
    ),
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Collections
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
            AI Tool Collections
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Curated lists for discovering, comparing, and choosing AI tools by workflow.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {collections.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => {
              const metadata = normalizeMetadata(collection.metadata);
              return (
                <Link
                  key={collection.slug}
                  href={`/${locale}/collections/${collection.slug}`}
                  className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {metadata.featured ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Featured
                    </span>
                  ) : null}
                  <h2 className="mt-4 text-xl font-semibold">{collection.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {collection.description ??
                      metadata.heroIntro ??
                      "Open this curated AI tool collection."}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-slate-900">
                    {collection._count.items} tools
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border bg-white p-8 text-sm text-slate-600">
            No public collections yet.
          </div>
        )}
      </section>
    </main>
  );
}

function normalizeMetadata(value: unknown): { featured?: boolean; heroIntro?: string } {
  return value && typeof value === "object"
    ? (value as { featured?: boolean; heroIntro?: string })
    : {};
}
