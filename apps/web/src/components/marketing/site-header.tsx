import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

type SiteHeaderProps = {
  locale: string;
};

export async function SiteHeader({ locale }: SiteHeaderProps) {
  const t = await getTranslations("landing.nav");

  const links = [
    { href: `/${locale}/docs`, label: t("docs") },
    { href: `/${locale}/pricing`, label: t("pricing") },
    { href: `/${locale}/showcase`, label: t("showcase") },
    { href: `/${locale}/blog`, label: t("blog") },
    { href: `/${locale}/changelog`, label: t("changelog") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href={`/${locale}`} className="font-semibold tracking-tight">
          AI Tool CMS
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://github.com/zhshg/ai-tool-cms"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/${locale}/docs`}>{t("getStarted")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
