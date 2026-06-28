import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { ToolDetailPage } from "@/components/seo/tool-detail-page";
import { getToolPage } from "@/lib/tool-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getToolPage(slug, locale);
  if (!page) return {};
  return page.metadata as Metadata;
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const page = await getToolPage(slug, locale);
  if (!page) notFound();

  return <ToolDetailPage data={page.data} />;
}
