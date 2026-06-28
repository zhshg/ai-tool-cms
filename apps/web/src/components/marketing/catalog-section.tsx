import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { CatalogTool } from "@/lib/catalog";

type CatalogSectionProps = {
  locale: string;
  categories: Array<{ slug: string; name: string; toolCount: number }>;
  latestTools: CatalogTool[];
};

export async function CatalogSection({ locale, categories, latestTools }: CatalogSectionProps) {
  const t = await getTranslations("home");

  return (
    <section className="border-t px-6 py-16">
      <div className="mx-auto max-w-6xl space-y-12">
        {categories.length > 0 && (
          <div className="space-y-4">
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
          </div>
        )}

        {latestTools.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("latest")}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        )}
      </div>
    </section>
  );
}
