import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getHomePageData } from "@/lib/catalog";

export default async function ShowcasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.showcase");
  const { trendingTools, categories } = await getHomePageData(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-6xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">{t("trending")}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingTools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${locale}/tools/${tool.slug}`}
                  className="block rounded-xl border p-5 hover:shadow-md"
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
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">{t("categories")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${locale}/category/${cat.slug}`}
                className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
              >
                {cat.name} ({cat.toolCount})
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
