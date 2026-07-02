import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { SeoLandingPage } from "@/components/seo/landing-page";
import { getCollectionLanding } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const landing = await getCollectionLanding("best-ai-tools", locale);
  if (!landing) return {};
  return landing.metadata as Metadata;
}

export default async function BestAiToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const landing = await getCollectionLanding("best-ai-tools", locale);
  if (!landing) notFound();

  return <SeoLandingPage locale={locale} {...landing.data} />;
}
