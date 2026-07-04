import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SeoGrowthPage } from "@/components/seo/growth-landing-page";
import { getTopAiToolsLanding } from "@/lib/seo-growth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const landing = await getTopAiToolsLanding(locale);
  return landing.metadata as Metadata;
}

export default async function TopAiToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const landing = await getTopAiToolsLanding(locale);

  return <SeoGrowthPage locale={locale} {...landing.data} />;
}
