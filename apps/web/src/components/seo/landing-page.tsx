import Link from "next/link";
import type { CatalogFaq, CatalogTool } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";

type SeoLandingPageProps = {
  locale: string;
  title: string;
  aiSummary: string;
  faqs: CatalogFaq[];
  relatedTools: CatalogTool[];
  trendingTools: CatalogTool[];
  jsonLd: Record<string, unknown>[];
};

export function SeoLandingPage({
  locale,
  title,
  aiSummary,
  faqs,
  relatedTools,
  trendingTools,
  jsonLd,
}: SeoLandingPageProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <section aria-labelledby="ai-summary-heading">
            <h2
              id="ai-summary-heading"
              className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
            >
              AI Summary
            </h2>
            <p className="mt-2 text-base leading-relaxed text-foreground">{aiSummary}</p>
          </section>
        </header>

        <section aria-labelledby="related-tools-heading">
          <h2 id="related-tools-heading" className="text-xl font-semibold">
            Related Tools
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedTools.map((tool) => (
              <li key={tool.slug} className="rounded-lg border p-4">
                <Link
                  href={`/${locale}/tools/${tool.slug}`}
                  className="font-medium hover:underline"
                >
                  {tool.name}
                </Link>
                {tool.summary ? (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{tool.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="trending-tools-heading">
          <h2 id="trending-tools-heading" className="text-xl font-semibold">
            Trending Tools
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {trendingTools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${locale}/tools/${tool.slug}`}
                  className="inline-flex rounded-full border px-3 py-1 text-sm hover:bg-muted"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-xl font-semibold">
            FAQ
          </h2>
          <dl className="mt-4 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border p-4">
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}
