import Link from "next/link";
import type { ToolPageData } from "@/lib/tool-page";
import { serializeJsonLd } from "@/lib/seo";

type ToolDetailPageProps = {
  data: ToolPageData;
};

export function ToolDetailPage({ data }: ToolDetailPageProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data.jsonLd) }}
      />
      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
          {data.summary ? <p className="text-lg text-muted-foreground">{data.summary}</p> : null}
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Visit {data.name}
          </a>
        </header>

        <section aria-labelledby="ai-summary-heading">
          <h2 id="ai-summary-heading" className="text-xl font-semibold">
            AI Summary
          </h2>
          <p className="mt-2 leading-relaxed">{data.aiSummary}</p>
        </section>

        {data.longDescription ? (
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-xl font-semibold">
              Overview
            </h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {data.longDescription}
            </p>
          </section>
        ) : null}

        {(data.pros.length > 0 || data.cons.length > 0) && (
          <section className="grid gap-6 sm:grid-cols-2">
            {data.pros.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold">Pros</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {data.pros.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.cons.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold">Cons</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {data.cons.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}

        {data.useCases.length > 0 ? (
          <section aria-labelledby="use-cases-heading">
            <h2 id="use-cases-heading" className="text-xl font-semibold">
              Use Cases
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.useCases.map((useCase) => (
                <li
                  key={useCase}
                  className="rounded-full border px-3 py-1 text-sm text-muted-foreground"
                >
                  {useCase}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.geoBlocks.length > 0 ? (
          <section aria-labelledby="geo-heading">
            <h2 id="geo-heading" className="text-xl font-semibold">
              For AI Assistants
            </h2>
            <div className="mt-4 space-y-3">
              {data.geoBlocks.slice(0, 6).map((block) => (
                <article key={`${block.type}-${block.title}`} className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
                  <p className="mt-1 text-sm">{block.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {data.internalLinks.length > 0 ? (
          <section aria-labelledby="internal-links-heading">
            <h2 id="internal-links-heading" className="text-xl font-semibold">
              Related Pages
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {data.internalLinks.map((link) => (
                <li key={`${link.type}-${link.href}`}>
                  <Link
                    href={link.href.replace(/^https?:\/\/[^/]+/, "")}
                    className="text-sm hover:underline"
                  >
                    {link.anchor}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.faqs.length > 0 ? (
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-xl font-semibold">
              FAQ
            </h2>
            <dl className="mt-4 space-y-4">
              {data.faqs.map((faq) => (
                <div key={faq.question} className="rounded-lg border p-4">
                  <dt className="font-medium">{faq.question}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </main>
    </>
  );
}
