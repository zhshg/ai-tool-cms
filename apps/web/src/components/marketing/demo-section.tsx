import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { CatalogTool } from "@/lib/catalog";

type DemoSectionProps = {
  locale: string;
  trendingTools: CatalogTool[];
};

export async function DemoSection({ locale, trendingTools }: DemoSectionProps) {
  const t = await getTranslations("landing.demo");

  return (
    <section className="border-t bg-muted/20 px-6 py-20" id="demo">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        {trendingTools.length > 0 ? (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingTools.slice(0, 6).map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${locale}/tools/${tool.slug}`}
                  className="block rounded-xl border bg-card p-5 transition hover:border-foreground/20 hover:shadow-md"
                >
                  <span className="font-medium">{tool.name}</span>
                  {tool.summary && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {tool.summary}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-center text-muted-foreground">{t("empty")}</p>
        )}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/category/all`}>{t("browseAll")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
