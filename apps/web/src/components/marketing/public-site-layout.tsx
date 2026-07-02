import type { ReactNode } from "react";

import { getPublicShellData } from "@/lib/catalog";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type PublicSiteLayoutProps = {
  children: ReactNode;
  locale: string;
};

export async function PublicSiteLayout({ children, locale }: PublicSiteLayoutProps) {
  const shellData = await getPublicShellData();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale={locale} categories={shellData.categories} />
      <div className="flex-1">{children}</div>
      <SiteFooter locale={locale} categories={shellData.categories} popularTools={shellData.popularTools} />
    </div>
  );
}
