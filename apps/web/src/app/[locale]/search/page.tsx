import { AlertTriangle, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import { getSearchPageFilters, searchCatalogTools } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildMetadata,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

const PAGE_SIZE = 12;

const pricingOptions = [
  { value: "", label: "All pricing" },
  { value: "FREE", label: "Free" },
  { value: "FREEMIUM", label: "Freemium" },
  { value: "PAID", label: "Paid" },
  { value: "CONTACT", label: "Contact sales" },
];

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "trending", label: "Trending" },
  { value: "a-z", label: "A-Z" },
  { value: "rating", label: "Rating" },
];

export const dynamic = "force-dynamic";

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    pricing?: string;
    tag?: string;
    platform?: string;
    language?: string;
    api?: string;
    free?: string;
    openSource?: string;
    sort?: string;
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
    ? `Search AI tools for ${query} with category, pricing, tag, platform, language, and API filters.`
    : "Search AI tools by keyword, category, pricing, tags, platform, language, API support, and open-source availability.";

  return buildMetadata(
    {
      title,
      description,
      path,
      noIndex: Boolean(query),
      ogType: "website",
    },
    config,
  ) as Metadata;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);

  const query = filters.q?.trim() ?? "";
  const category = filters.category?.trim() ?? "";
  const pricing = filters.pricing?.trim() ?? "";
  const tag = filters.tag?.trim() ?? "";
  const platform = filters.platform?.trim() ?? "";
  const language = filters.language?.trim() ?? "";
  const api = parseBooleanFilter(filters.api);
  const free = parseBooleanFilter(filters.free);
  const openSource = parseBooleanFilter(filters.openSource);
  const sort = filters.sort?.trim() || (query ? "relevance" : "newest");
  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const [result, filterOptions] = await Promise.all([
    searchCatalogTools({
      locale,
      query,
      category,
      pricing,
      tag,
      platform,
      language,
      api,
      free,
      openSource,
      sort,
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
  const activeFilters = buildActiveFilters({
    category,
    pricing,
    tag,
    platform,
    language,
    api,
    free,
    openSource,
    sort,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl space-y-3 border-b pb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Advanced Search
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {query ? `Search results for "${query}"` : "Search AI Tools"}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Search published AI tools by keyword, then narrow results by category, tag, pricing,
            platform, language, API support, free access, and open-source availability.
          </p>
        </header>

        <form action={`/${locale}/search`} className="mt-6 rounded-xl border bg-card p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_160px]">
            <label className="relative block">
              <span className="sr-only">Search query</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                list="search-suggestions"
                placeholder="Search AI tools"
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
              />
              <datalist id="search-suggestions">
                {[
                  ...filterOptions.suggestions,
                  ...filterOptions.synonyms,
                  ...filterOptions.popularSearches,
                  ...filterOptions.recentSearches,
                ].map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <Select name="sort" value={sort} label="Sort" options={sortOptions} />
            <Select name="pricing" value={pricing} label="Pricing" options={pricingOptions} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select
              name="category"
              value={category}
              label="Category"
              options={toSelectOptions(filterOptions.categories, "All categories")}
            />
            <Select
              name="tag"
              value={tag}
              label="Tag"
              options={toSelectOptions(filterOptions.tags, "All tags")}
            />
            <Select
              name="platform"
              value={platform}
              label="Platform"
              options={toSelectOptions(filterOptions.platforms, "All platforms")}
            />
            <Select
              name="language"
              value={language}
              label="Language"
              options={toSelectOptions(filterOptions.languages, "All languages")}
            />
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Checkbox name="api" checked={api} label="API" />
              <Checkbox name="free" checked={free} label="Free" />
              <Checkbox name="openSource" checked={openSource} label="Open Source" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="h-10 flex-1 lg:flex-none">
                Search
              </Button>
              <Button asChild type="button" variant="outline" className="h-10">
                <Link href={`/${locale}/search`}>Reset</Link>
              </Button>
            </div>
          </div>
        </form>

        <SuggestionLinks
          locale={locale}
          title="Suggestions"
          items={filterOptions.suggestions.slice(0, 8)}
        />
        <SuggestionLinks
          locale={locale}
          title="Synonyms"
          items={filterOptions.synonyms.slice(0, 8)}
        />
        <SuggestionLinks
          locale={locale}
          title="Popular searches"
          items={filterOptions.popularSearches.slice(0, 8)}
        />
        <SuggestionLinks
          locale={locale}
          title="Recent searches"
          items={filterOptions.recentSearches.slice(0, 8)}
        />

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

        {activeFilters.length ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {activeFilters.map((item) => (
              <span key={item} className="rounded-full bg-muted px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <section className="mt-6 space-y-4">
          {result.hits.length ? (
            result.hits.map(({ document }) => (
              <article key={document.id} className="rounded-lg border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ToolLogo
                      name={document.name}
                      logoUrl={document.logoUrl}
                      fallbackLogoUrl={document.collectedLogoUrl}
                      size="md"
                    />
                    <div className="min-w-0">
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {document.pricingModel ? (
                      <Badge>{formatPricing(document.pricingModel)}</Badge>
                    ) : null}
                    {document.hasApi ? <Badge>API</Badge> : null}
                    {document.isOpenSource ? <Badge>Open Source</Badge> : null}
                    {document.reviewScore ? (
                      <Badge>{document.reviewScore.toFixed(1)} rating</Badge>
                    ) : null}
                  </div>
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
                  {document.platforms.slice(0, 2).map((item) => (
                    <span
                      key={`${document.id}-platform-${item}`}
                      className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                  {document.languages.slice(0, 2).map((item) => (
                    <span
                      key={`${document.id}-language-${item}`}
                      className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                    >
                      {item}
                    </span>
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
          filters={{
            q: query,
            category,
            pricing,
            tag,
            platform,
            language,
            api: api ? "true" : "",
            free: free ? "true" : "",
            openSource: openSource ? "true" : "",
            sort,
          }}
        />
      </main>
    </>
  );
}

function Select({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={`${name}-${option.value || option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
      <input type="checkbox" name={name} value="true" defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}

function SuggestionLinks({
  locale,
  title,
  items,
}: {
  locale: string;
  title: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <section className="mt-5 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-muted-foreground">{title}:</span>
      {items.map((item) => (
        <Link
          key={`${title}-${item}`}
          href={`/${locale}/search?q=${encodeURIComponent(item)}`}
          className="rounded-full bg-muted px-3 py-1 text-muted-foreground hover:text-foreground"
        >
          {item}
        </Link>
      ))}
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{children}</span>
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

function toSelectOptions(options: Array<{ slug: string; name: string }>, allLabel: string) {
  return [
    { value: "", label: allLabel },
    ...options.map((option) => ({ value: option.slug, label: option.name })),
  ];
}

function parseBooleanFilter(value?: string) {
  return value === "true" || value === "1" || value === "on";
}

function buildActiveFilters(filters: {
  category: string;
  pricing: string;
  tag: string;
  platform: string;
  language: string;
  api: boolean;
  free: boolean;
  openSource: boolean;
  sort: string;
}) {
  return [
    filters.category ? `Category: ${filters.category}` : "",
    filters.pricing ? `Pricing: ${formatPricing(filters.pricing)}` : "",
    filters.tag ? `Tag: ${filters.tag}` : "",
    filters.platform ? `Platform: ${filters.platform}` : "",
    filters.language ? `Language: ${filters.language}` : "",
    filters.api ? "API" : "",
    filters.free ? "Free" : "",
    filters.openSource ? "Open Source" : "",
    filters.sort ? `Sort: ${filters.sort}` : "",
  ].filter(Boolean);
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
