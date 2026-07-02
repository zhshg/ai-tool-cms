"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { HomePageCategory } from "@/lib/catalog";

type SiteHeaderProps = {
  locale: string;
  categories: HomePageCategory[];
};

export function SiteHeader({ locale, categories }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const links = [
    { href: `/${locale}/categories`, label: locale === "zh" ? "分类" : "Categories" },
    { href: `/${locale}/tools`, label: locale === "zh" ? "工具" : "Tools" },
    { href: `/${locale}/blog`, label: locale === "zh" ? "博客" : "Blog" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-slate-950 text-sm font-semibold text-white">
              AI
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none text-foreground">
                AI Tool Directory
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {locale === "zh" ? "AI 工具发现与比较" : "Discover and compare AI tools"}
              </div>
            </div>
          </div>
        </Link>

        <form
          action={`/${locale}/search`}
          className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg border bg-card px-3 py-2 lg:flex"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder={locale === "zh" ? "搜索工具、分类、标签" : "Search tools, categories, tags"}
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" className="shrink-0">
            {locale === "zh" ? "搜索" : "Search"}
          </Button>
        </form>

        <nav className="hidden items-center gap-5 text-sm lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/search`} aria-label={locale === "zh" ? "搜索" : "Search"}>
              <Search className="size-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={locale === "zh" ? "打开导航" : "Open navigation"}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t bg-background lg:hidden">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6">
            <form
              action={`/${locale}/search`}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="search"
                name="q"
                placeholder={locale === "zh" ? "搜索工具、分类、标签" : "Search tools, categories, tags"}
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" size="sm" className="shrink-0">
                {locale === "zh" ? "搜索" : "Search"}
              </Button>
            </form>

            <nav className="grid gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border px-4 py-3 text-sm font-medium text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <section className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {locale === "zh" ? "热门分类" : "Popular categories"}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/${locale}/category/${category.slug}`}
                    onClick={() => setOpen(false)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </header>
  );
}
