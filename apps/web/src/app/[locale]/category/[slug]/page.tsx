import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CategoryLandingExperience } from "@/components/category/category-directory";
import { serializeJsonLd } from "@/lib/seo";
import { getCategoryLanding } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const landing = await getCategoryLanding(slug, locale);
  if (!landing) return {};
  return landing.metadata as Metadata;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const landing = await getCategoryLanding(slug, locale);
  if (!landing) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(landing.data.jsonLd) }}
      />
      <CategoryLandingExperience locale={locale} data={landing.data} />
    </>
  );
}
