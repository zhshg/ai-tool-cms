import { AlertTriangle, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSearchPageFilters, searchCatalogTools } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildItemListJsonLd, getSiteConfig, joinUrl } from "@ai-tool-cms/seo";

const PAGE_SIZE = 12;

const pricingOptions = [
  { value: "", label: "All pricing" },
  { value: "FREE", label: "Free" },
  { value: "FREEMIUM", label: "Freemium" },
  { value: "PAID", label: "Paid" },
  { value: "CONTACT", label: "Contact sales" },
];

export const dynamic = "force-dynamic";

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    pricing?: string;
    tag?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const filters = await searchParams;
  const query = filters.q?.trim();
  const config = getSiteConfig();
  const path = `/${locale}/search`;
  const title = query ? `${query} AI Tool Search` : "Search AI Tools";
  const description = query
    ? `Search AI tools for ${query} with category, pricing, and tag filters.`
    : "Search AI tools by keyword, category, pricing, and tags.";

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
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);

  const query = filters.q?.trim() ?? "";
  const category = filters.category?.trim() ?? "";
  const pricing = filters.pricing?.trim() ?? "";
  const tag = filters.tag?.trim() ?? "";
  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const [result, filterOptions] = await Promise.all([
    searchCatalogTools({
      locale,
      query,
      category,
      pricing,
      tag,
      page,
      pageSize: PAGE_SIZE,
    }),
    getSearchPageFilters(),
  ]);
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
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl space-y-3 border-b pb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Search
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {query ? `Search results for "${query}"` : "Search AI Tools"}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Search published AI tools by keyword and narrow results with category, pricing, and tag
            filters.
          </p>
        </header>

        <form
          action={`/${locale}/search`}
          className="mt-6 grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(220px,1fr)_220px_180px_220px_auto]"
        >
          <label className="relative block">
            <span className="sr-only">Search query</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search AI tools"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </label>
          <label>
            <span className="sr-only">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Pricing</span>
            <select
              name="pricing"
              defaultValue={pricing}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            >
              {pricingOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Tag</span>
            <select
              name="tag"
              defaultValue={tag}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="">All tags</option>
              {filterOptions.tags.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="h-10 flex-1 lg:flex-none">
              Search
            </Button>
            <Button asChild type="button" variant="outline" className="h-10">
              <Link href={`/${locale}/search`}>Reset</Link>
            </Button>
          </div>
        </form>

        {result.degraded ? (
          <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Search is temporarily unavailable.</p>
                <p className="mt-1">
                  The search service did not respond, so this page returned an empty result set
                  instead of failing.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-col justify-between gap-3 border-y py-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            {result.totalHits} results
            {query ? ` for "${query}"` : ""}
          </p>
          <p>
            Page {result.page} of {result.totalPages}
          </p>
        </div>

        <section className="mt-6 space-y-4">
          {result.hits.length ? (
            result.hits.map(({ document }) => (
              <article key={document.id} className="rounded-lg border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      <Link href={`/${locale}/tools/${document.slug}`} className="hover:underline">
                        {document.name}
                      </Link>
                    </h2>
                    {document.summary ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {document.summary}
                      </p>
                    ) : null}
                  </div>
                  {document.pricingModel ? (
                    <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                      {formatPricing(document.pricingModel)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {document.categoryNames.slice(0, 2).map((name, index) => (
                    <Link
                      key={`${document.id}-${name}`}
                      href={`/${locale}/category/${document.categorySlugs[index]}`}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {name}
                    </Link>
                  ))}
                  {document.tagNames.slice(0, 3).map((name, index) => (
                    <Link
                      key={`${document.id}-tag-${name}`}
                      href={`/${locale}/tag/${document.tagSlugs[index]}`}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="text-xl font-semibold">No matching tools</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Try a broader keyword or remove one of the filters to see more AI tools.
              </p>
            </div>
          )}
        </section>

        <Pagination
          locale={locale}
          page={page}
          totalPages={result.totalPages}
          filters={{ q: query, category, pricing, tag }}
        />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Pagination({
  locale,
  page,
  totalPages,
  filters,
}: {
  locale: string;
  page: number;
  totalPages: number;
  filters: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav className="mt-10 flex items-center justify-between border-t pt-6 text-sm">
      {previous ? (
        <Link href={buildSearchPageHref(locale, filters, previous)} className="hover:underline">
          Previous
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous</span>
      )}
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link href={buildSearchPageHref(locale, filters, next)} className="hover:underline">
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}

function buildSearchPageHref(locale: string, filters: Record<string, string>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/${locale}/search?${params.toString()}`;
}

function formatPricing(pricing: string) {
  const labels: Record<string, string> = {
    FREE: "Free",
    FREEMIUM: "Freemium",
    PAID: "Paid",
    CONTACT: "Contact sales",
  };
  return labels[pricing] ?? pricing;
}
