import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { searchCatalogTools } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildItemListJsonLd, getSiteConfig, joinUrl } from "@ai-tool-cms/seo";

const PAGE_SIZE = 12;

export const dynamic = "force-dynamic";

type ToolsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const config = getSiteConfig();
  const path = `/${locale}/tools`;
  return {
    title: "AI Tools Directory",
    description: "Browse curated AI tools with categories, pricing, summaries, and comparison links.",
    alternates: { canonical: joinUrl(config.siteUrl, path) },
    openGraph: {
      title: "AI Tools Directory",
      description: "Browse curated AI tools with categories, pricing, summaries, and comparison links.",
      url: joinUrl(config.siteUrl, path),
      type: "website",
    },
  };
}

export default async function ToolsPage({ params, searchParams }: ToolsPageProps) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const result = await searchCatalogTools({ locale, page, pageSize: PAGE_SIZE });
  const config = getSiteConfig();
  const path = `/${locale}/tools`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: "AI Tools Directory",
      url,
      items: result.hits.map((hit, index) => ({
        name: hit.document.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${hit.document.slug}`),
        position: (page - 1) * PAGE_SIZE + index + 1,
      })),
    }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: "Tools", path },
      ],
      config.siteUrl,
    ),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="max-w-3xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Directory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">AI Tools Directory</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Browse published AI tools by category, tags, pricing model, and use case.
          </p>
        </header>

        <div className="mt-8 flex items-center justify-between gap-4 border-y py-4 text-sm text-muted-foreground">
          <p>
            {result.totalHits} tools · page {result.page} of {result.totalPages}
          </p>
          <Link href={`/${locale}/search`} className="font-medium text-foreground hover:underline">
            Search tools
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.hits.map(({ document }) => (
            <article key={document.id} className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  <Link href={`/${locale}/tools/${document.slug}`} className="hover:underline">
                    {document.name}
                  </Link>
                </h2>
                {document.pricingModel ? (
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {document.pricingModel}
                  </span>
                ) : null}
              </div>
              {document.summary ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {document.summary}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {document.categoryNames.slice(0, 2).map((name, index) => (
                  <Link
                    key={`${document.id}-${name}`}
                    href={`/${locale}/category/${document.categorySlugs[index]}`}
                    className="rounded-full bg-muted px-2 py-1 text-xs hover:bg-muted/70"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>

        <Pagination locale={locale} basePath="/tools" page={page} totalPages={result.totalPages} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Pagination({
  locale,
  basePath,
  page,
  totalPages,
}: {
  locale: string;
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav className="mt-10 flex items-center justify-between border-t pt-6 text-sm">
      {previous ? (
        <Link href={`/${locale}${basePath}?page=${previous}`} className="hover:underline">
          Previous
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous</span>
      )}
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link href={`/${locale}${basePath}?page=${next}`} className="hover:underline">
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}
