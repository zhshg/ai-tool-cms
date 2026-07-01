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

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;
  const query = q?.trim();
  const config = getSiteConfig();
  const path = `/${locale}/search`;
  const title = query ? `Search results for ${query}` : "Search AI Tools";
  const description = query
    ? `Search results for ${query} in the AI Tool CMS catalog.`
    : "Search the AI Tool CMS catalog by tool name, category, tag, and use case.";

  return {
    title,
    description,
    alternates: { canonical: joinUrl(config.siteUrl, path) },
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: joinUrl(config.siteUrl, path),
      type: "website",
    },
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const { q, page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const result = await searchCatalogTools({ locale, query, page, pageSize: PAGE_SIZE });
  const config = getSiteConfig();
  const path = `/${locale}/search`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: query ? `Search results for ${query}` : "Search AI Tools",
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
        { name: "Search", path },
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
            Search
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {query ? `Search results for "${query}"` : "Search AI Tools"}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Find AI tools by name, category, tag, pricing model, and use case.
          </p>
        </header>

        <form action={`/${locale}/search`} className="mt-8 flex max-w-2xl gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search AI tools"
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Search
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between gap-4 border-y py-4 text-sm text-muted-foreground">
          <p>
            {result.totalHits} results · page {result.page} of {result.totalPages}
          </p>
          <p>{result.processingTimeMs} ms</p>
        </div>

        <section className="mt-8 space-y-4">
          {result.hits.length > 0 ? (
            result.hits.map(({ document }) => (
              <article key={document.id} className="rounded-lg border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{document.summary}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {document.categoryNames.slice(0, 3).map((name, index) => (
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
            ))
          ) : (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              No tools matched this search.
            </div>
          )}
        </section>

        <Pagination locale={locale} query={query} page={page} totalPages={result.totalPages} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Pagination({
  locale,
  query,
  page,
  totalPages,
}: {
  locale: string;
  query: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const params = (targetPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    search.set("page", String(targetPage));
    return search.toString();
  };

  return (
    <nav className="mt-10 flex items-center justify-between border-t pt-6 text-sm">
      {previous ? (
        <Link href={`/${locale}/search?${params(previous)}`} className="hover:underline">
          Previous
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous</span>
      )}
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link href={`/${locale}/search?${params(next)}`} className="hover:underline">
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}
