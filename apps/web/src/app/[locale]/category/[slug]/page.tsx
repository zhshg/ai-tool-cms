import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { SeoLandingPage } from "@/components/seo/landing-page";
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

  return <SeoLandingPage locale={locale} {...landing.data} />;
}
