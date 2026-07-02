import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

type SiteHeaderProps = {
  locale: string;
};

export async function SiteHeader({ locale }: SiteHeaderProps) {
  const links = [
    { href: `/${locale}/tools`, label: locale === "zh" ? "全部工具" : "All tools" },
    { href: `/${locale}#categories`, label: locale === "zh" ? "分类" : "Categories" },
    { href: `/${locale}#trending`, label: locale === "zh" ? "趋势" : "Trending" },
    { href: `/${locale}/blog`, label: locale === "zh" ? "指南" : "Guides" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href={`/${locale}`} className="font-semibold tracking-tight">
          AI Tool Directory
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
            <Link href={`/${locale}/search`}>
              <Search className="size-4" />
              {locale === "zh" ? "搜索" : "Search"}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/${locale}/tools`}>{locale === "zh" ? "浏览目录" : "Browse directory"}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
