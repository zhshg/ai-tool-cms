import { ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getToolsDirectory, type ToolsDirectoryTool } from "@/lib/catalog";
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
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "name", label: "Name" },
];

export const dynamic = "force-dynamic";

type ToolsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    pricing?: string;
    sort?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const filters = await searchParams;
  const query = filters.q?.trim();
  const config = getSiteConfig();
  const path = `/${locale}/tools`;
  const title = query ? `${query} AI Tools` : "AI Tools Directory";
  const description = query
    ? `Find ${query} AI tools with category filters, pricing models, summaries, and website links.`
    : "Browse AI tools by category, pricing, popularity, and launch date.";

  return buildMetadata(
    {
      title,
      description,
      path,
      ogType: "website",
    },
    config,
  ) as Metadata;
}

export default async function ToolsPage({ params, searchParams }: ToolsPageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);

  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const result = await getToolsDirectory({
    locale,
    query: filters.q,
    category: filters.category,
    pricing: filters.pricing,
    sort: filters.sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const config = getSiteConfig();
  const path = `/${locale}/tools`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: result.query ? `${result.query} AI Tools` : "AI Tools Directory",
      url,
      items: result.tools.map((tool, index) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
        position: (result.page - 1) * PAGE_SIZE + index + 1,
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b pb-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              AI tools
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Discover AI tools for real workflows
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Search published tools, compare pricing, narrow by category, and open the official
              website when a tool matches your use case.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-center">
            <Stat label="Tools" value={result.totalHits.toLocaleString("en-US")} />
            <Stat label="Categories" value={result.categories.length.toLocaleString("en-US")} />
            <Stat label="Page" value={`${result.page}/${result.totalPages}`} />
          </div>
        </header>

        <form
          action={`/${locale}/tools`}
          className="mt-6 grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(220px,1fr)_220px_170px_150px_auto]"
        >
          <label className="relative block">
            <span className="sr-only">Search tools</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={result.query}
              placeholder="Search AI tools"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </label>
          <label>
            <span className="sr-only">Category</span>
            <select
              name="category"
              defaultValue={result.category}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="">All categories</option>
              {result.categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name} ({category.toolCount})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Pricing</span>
            <select
              name="pricing"
              defaultValue={result.pricing}
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
            <span className="sr-only">Sort</span>
            <select
              name="sort"
              defaultValue={result.sort}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="h-10 flex-1 lg:flex-none">
              <SlidersHorizontal />
              Apply
            </Button>
            <Button asChild type="button" variant="outline" className="h-10">
              <Link href={`/${locale}/tools`}>Reset</Link>
            </Button>
          </div>
        </form>

        <div className="mt-6 flex flex-col justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            Showing {result.tools.length} of {result.totalHits} tools
            {result.query ? ` for "${result.query}"` : ""}
          </p>
          <p>Sorted by {sortOptions.find((option) => option.value === result.sort)?.label}</p>
        </div>

        {result.tools.length ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.tools.map((tool) => (
              <ToolCard key={tool.id} locale={locale} tool={tool} />
            ))}
          </section>
        ) : (
          <EmptyState locale={locale} />
        )}

        <Pagination
          locale={locale}
          page={result.page}
          totalPages={result.totalPages}
          filters={filters}
        />
      </main>
    </>
  );
}

function ToolCard({ locale, tool }: { locale: string; tool: ToolsDirectoryTool }) {
  const category = tool.primaryCategory;
  const initials = tool.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article className="flex h-full flex-col rounded-lg border bg-card p-5 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-sm font-semibold">
          {tool.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tool.logoUrl} alt={`${tool.name} logo`} className="size-full object-cover" />
          ) : (
            <span>{initials || "AI"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-6">
              <Link href={`/${locale}/tools/${tool.slug}`} className="hover:underline">
                {tool.name}
              </Link>
            </h2>
            <span className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
              {formatPricing(tool.pricingModel)}
            </span>
          </div>
          {category ? (
            <Link
              href={`/${locale}/category/${category.slug}`}
              className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
            >
              {category.name}
            </Link>
          ) : null}
        </div>
      </div>

      <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
        {tool.summary ?? "No short description is available yet."}
      </p>

      <div className="mt-4 flex min-h-7 flex-wrap gap-2">
        {tool.tags.length ? (
          tool.tags.slice(0, 4).map((tag) => (
            <Link
              key={tag.slug}
              href={`/${locale}/tag/${tag.slug}`}
              className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {tag.name}
            </Link>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No tags</span>
        )}
      </div>

      <div className="mt-5 flex gap-2 border-t pt-4">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/${locale}/tools/${tool.slug}`}>Details</Link>
        </Button>
        <Button asChild className="flex-1">
          <a href={tool.website} target="_blank" rel="noreferrer">
            Website
            <ExternalLink />
          </a>
        </Button>
      </div>
    </article>
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
  filters: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav className="mt-10 flex items-center justify-between border-t pt-6 text-sm">
      {previous ? (
        <Link href={buildToolsPageHref(locale, filters, previous)} className="hover:underline">
          Previous
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous</span>
      )}
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link href={buildToolsPageHref(locale, filters, next)} className="hover:underline">
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}

function EmptyState({ locale }: { locale: string }) {
  return (
    <section className="mt-8 rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-xl font-semibold">No tools found</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Try a broader keyword, remove a category filter, or reset pricing to see more published AI
        tools.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href={`/${locale}/tools`}>Clear filters</Link>
      </Button>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function buildToolsPageHref(
  locale: string,
  filters: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key !== "page" && value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/${locale}/tools?${params.toString()}`;
}

function formatPricing(pricing: string) {
  const option = pricingOptions.find((item) => item.value === pricing);
  return option?.label ?? pricing;
}
