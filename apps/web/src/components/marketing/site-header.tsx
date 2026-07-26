"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { HomePageCategory } from "@/lib/catalog";

type SiteHeaderProps = {
  locale: string;
  categories: HomePageCategory[];
};

const LOCALES = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "zh-CN", label: "简体中文", shortLabel: "简" },
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁" },
  { code: "ja", label: "日本語", shortLabel: "日" },
  { code: "ko", label: "한국어", shortLabel: "한" },
  { code: "es", label: "Español", shortLabel: "ES" },
  { code: "de", label: "Deutsch", shortLabel: "DE" },
  { code: "fr", label: "Français", shortLabel: "FR" },
  { code: "pt-BR", label: "Português", shortLabel: "PT" },
  { code: "ru", label: "Русский", shortLabel: "RU" },
] as const;

export function SiteHeader({ locale, categories }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const isZh = locale.startsWith("zh");
  const currentLocale = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];
  const hotCategories = categories.slice(0, 10);
  const otherCategories = categories.slice(10);
  const links = [
    { href: `/${locale}/categories`, label: isZh ? "类别" : "Categories" },
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
                alt="ToolsDar logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 pl-4 text-sm lg:flex">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCategoriesOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition hover:text-foreground"
              aria-haspopup="menu"
              aria-expanded={categoriesOpen}
            >
              {isZh ? "精选类别" : "Featured Categories"}
              <ChevronDown className="size-4" />
            </button>

            {categoriesOpen ? (
              <>
                <button
                  type="button"
                  aria-label={isZh ? "关闭类别菜单" : "Close categories menu"}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setCategoriesOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-3 w-[min(92vw,960px)] rounded-3xl border bg-background p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {isZh ? "精选类别" : "Featured Categories"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isZh
                          ? "按热度排序，点击进入分类页"
                          : "Sorted by heat, click to open each category page"}
                      </div>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                      {isZh ? "热度" : "Hot"}
                    </span>
                  </div>

                  <div className="max-h-[60vh] space-y-4 overflow-auto pr-1">
                    <CategoryGrid
                      locale={locale}
                      items={hotCategories}
                      featured
                      title={isZh ? "热度 TOP 10" : "Hot Top 10"}
                      onSelect={() => setCategoriesOpen(false)}
                    />
                    {otherCategories.length ? (
                      <CategoryGrid
                        locale={locale}
                        items={otherCategories}
                        title={isZh ? "其他类别" : "Other Categories"}
                        onSelect={() => setCategoriesOpen(false)}
                      />
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

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

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setLanguageOpen((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-full border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              aria-haspopup="menu"
              aria-expanded={languageOpen}
            >
              <span>{currentLocale.shortLabel}</span>
              <ChevronDown className="size-4" />
            </button>

            {languageOpen ? (
              <>
                <button
                  type="button"
                  aria-label={isZh ? "关闭语言菜单" : "Close language menu"}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setLanguageOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border bg-background p-2 shadow-2xl">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {isZh ? "切换语言" : "Language"}
                  </div>
                  <div className="grid gap-1">
                    {LOCALES.map((item) => (
                      <Link
                        key={item.code}
                        href={buildLocaleHref(pathname, item.code)}
                        hrefLang={item.code}
                        onClick={() => setLanguageOpen(false)}
                        className={[
                          "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50",
                          item.code === locale
                            ? "bg-slate-100 font-semibold text-slate-950"
                            : "text-slate-600",
                        ].join(" ")}
                      >
                        <span>{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.shortLabel}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={isZh ? "打开导航" : "Open navigation"}
            className="lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t bg-background lg:hidden">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {isZh ? "精选类别（热度排序）" : "Featured Categories (Hot)"}
                </div>
                <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {categories.length}
                </span>
              </div>
              <CategoryGrid
                locale={locale}
                items={hotCategories}
                featured
                onSelect={() => setOpen(false)}
              />
              {otherCategories.length ? (
                <CategoryGrid
                  locale={locale}
                  items={otherCategories}
                  onSelect={() => setOpen(false)}
                />
              ) : null}
            </section>

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
                {isZh ? "切换语言" : "Language"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LOCALES.map((item) => (
                  <Link
                    key={item.code}
                    href={buildLocaleHref(pathname, item.code)}
                    hrefLang={item.code}
                    onClick={() => setOpen(false)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm transition hover:bg-slate-50",
                      item.code === locale
                        ? "border-slate-950 font-semibold text-slate-950"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {item.label}
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

function buildLocaleHref(pathname: string | null, nextLocale: string) {
  const currentPath = pathname ?? "/";
  const parts = currentPath.split("/");
  if (LOCALES.some((item) => item.code === parts[1])) {
    parts[1] = nextLocale;
    return parts.join("/") || `/${nextLocale}`;
  }
  return `/${nextLocale}${currentPath === "/" ? "" : currentPath}`;
}

function CategoryGrid({
  locale,
  items,
  title,
  featured = false,
  onSelect,
}: {
  locale: string;
  items: HomePageCategory[];
  title?: string;
  featured?: boolean;
  onSelect: () => void;
}) {
  const isZh = locale.startsWith("zh");

  return (
    <section className="space-y-2">
      {title ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((category) => (
          <Link
            key={category.slug}
            href={`/${locale}/category/${category.slug}`}
            onClick={onSelect}
            className={[
              "rounded-2xl border px-3 py-2.5 transition hover:bg-slate-50",
              featured
                ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50"
                : "border-slate-200 hover:border-slate-300",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{category.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {category.toolCount} {isZh ? "个工具" : "tools"}
                </div>
              </div>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  featured ? "bg-white text-amber-700" : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                #{String(category.toolCount).padStart(3, "0")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
