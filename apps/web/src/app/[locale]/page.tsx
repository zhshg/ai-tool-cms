import { setRequestLocale } from "next-intl/server";

import { ArchitectureSection } from "@/components/marketing/architecture-section";
import { CatalogSection } from "@/components/marketing/catalog-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { DemoSection } from "@/components/marketing/demo-section";
import { DocsSection } from "@/components/marketing/docs-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { GithubSection } from "@/components/marketing/github-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoadmapSection } from "@/components/marketing/roadmap-section";
import { ScreenshotsSection } from "@/components/marketing/screenshots-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SponsorsSection } from "@/components/marketing/sponsors-section";
import { getHomePageData } from "@/lib/catalog";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { categories, latestTools, trendingTools } = await getHomePageData(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main>
        <HeroSection locale={locale} />
        <FeaturesSection />
        <ArchitectureSection />
        <DemoSection locale={locale} trendingTools={trendingTools} />
        <ScreenshotsSection />
        <SponsorsSection />
        <GithubSection />
        <DocsSection locale={locale} />
        <CatalogSection locale={locale} categories={categories} latestTools={latestTools} />
        <RoadmapSection locale={locale} />
        <CtaSection locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
