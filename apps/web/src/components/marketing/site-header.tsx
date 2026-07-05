"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { HomePageCategory } from "@/lib/catalog";

type SiteHeaderProps = {
  locale: string;
  categories: HomePageCategory[];
};

export function SiteHeader({ locale, categories }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const isZh = locale.startsWith("zh");
  const links = [
    { href: `/${locale}/categories`, label: isZh ? "分类" : "Categories" },
    { href: `/${locale}/tools`, label: isZh ? "工具" : "Tools" },
    { href: `/${locale}/blog`, label: isZh ? "博客" : "Blog" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="shrink-0">
          <div className="flex h-10 w-[137px] items-center">
            <div className="relative h-10 w-[137px]">
              <Image
                src="/toolsdar-icon-black.png"
                alt="ToolsDdar logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 pl-4 text-sm lg:flex">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={isZh ? "打开导航" : "Open navigation"}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t bg-background lg:hidden">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6">
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
                {isZh ? "热门分类" : "Popular categories"}
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
