import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getHomePageData } from "@/lib/catalog";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const { categories, latestTools, trendingTools } = await getHomePageData(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 p-8">
      <section className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </section>

      {trendingTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("trending")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {trendingTools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${locale}/tools/${tool.slug}`}
                  className="block rounded-lg border p-4 transition hover:bg-muted/50"
                >
                  <span className="font-medium">{tool.name}</span>
                  {tool.summary && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {tool.summary}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("categories")}</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button key={category.slug} variant="outline" asChild>
                <Link href={`/${locale}/category/${category.slug}`}>
                  {category.name}
                  {category.toolCount > 0 && (
                    <span className="ml-1 text-muted-foreground">({category.toolCount})</span>
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      {latestTools.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("latest")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {latestTools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${locale}/tools/${tool.slug}`}
                  className="block rounded-lg border p-4 transition hover:bg-muted/50"
                >
                  <span className="font-medium">{tool.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
