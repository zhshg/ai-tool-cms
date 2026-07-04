import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { SeoGrowthPage } from "@/components/seo/growth-landing-page";
import { getSeoGrowthLanding, SEO_GROWTH_SEGMENTS, type SeoGrowthSegment } from "@/lib/seo-growth";

function isSeoGrowthSegment(segment: string): segment is SeoGrowthSegment {
  return SEO_GROWTH_SEGMENTS.includes(segment as SeoGrowthSegment);
}

export function generateStaticParams() {
  return SEO_GROWTH_SEGMENTS.map((segment) => ({ segment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; segment: string }>;
}): Promise<Metadata> {
  const { locale, segment } = await params;
  if (!isSeoGrowthSegment(segment)) return {};

  const landing = await getSeoGrowthLanding(segment, locale);
  return landing.metadata as Metadata;
}

export default async function SeoGrowthSegmentPage({
  params,
}: {
  params: Promise<{ locale: string; segment: string }>;
}) {
  const { locale, segment } = await params;
  setRequestLocale(locale);

  if (!isSeoGrowthSegment(segment)) notFound();

  const landing = await getSeoGrowthLanding(segment, locale);

  return <SeoGrowthPage locale={locale} {...landing.data} />;
}
