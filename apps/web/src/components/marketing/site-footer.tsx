import Image from "next/image";
import Link from "next/link";

import type { CatalogTool, HomePageCategory } from "@/lib/catalog";

type SiteFooterProps = {
  locale: string;
  categories: HomePageCategory[];
  popularTools: CatalogTool[];
};

export function SiteFooter({ locale, categories, popularTools }: SiteFooterProps) {
  const isZh = locale.startsWith("zh");
  const labels = isZh
    ? {
        tagline: "围绕真实 AI 工具、分类、搜索和内容导航构建的公开目录站。",
        categories: "热门分类",
        popularTools: "热门工具",
        company: "站点",
        sitemap: "索引",
        tools: "全部工具",
        blog: "博客",
        search: "搜索",
        home: "首页",
        categoriesPage: "分类页",
        sitemapXml: "Sitemap",
        robots: "Robots",
        rss: "RSS",
        bestAiTools: "最佳 AI 工具",
        trendingAiTools: "热门 AI 工具",
      }
    : {
        categories: "Popular categories",
        tagline:
          "A public directory built for discovering real AI tools, categories, search, and editorial guidance.",
        popularTools: "Popular tools",
        company: "Company",
        sitemap: "Sitemap",
        tools: "All tools",
        blog: "Blog",
        search: "Search",
        home: "Home",
        categoriesPage: "Categories",
        sitemapXml: "Sitemap",
        robots: "Robots",
        rss: "RSS",
        bestAiTools: "Best AI Tools",
        trendingAiTools: "Trending AI Tools",
      };

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/60 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="relative h-10 w-[137px] shrink-0">
                <Image
                  src="/toolsdar-icon-black.png"
                  alt="ToolsDdar logo"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-500">{labels.tagline}</p>
          </div>

          <FooterList
            title={labels.categories}
            items={categories.slice(0, 6).map((category) => ({
              href: `/${locale}/category/${category.slug}`,
              label: category.name,
            }))}
          />

          <FooterList
            title={labels.popularTools}
            items={popularTools.slice(0, 6).map((tool) => ({
              href: `/${locale}/tools/${tool.slug}`,
              label: tool.name,
            }))}
          />

          <FooterList
            title={labels.company}
            items={[
              { href: `/${locale}`, label: labels.home },
              { href: `/${locale}/categories`, label: labels.categoriesPage },
              { href: `/${locale}/tools`, label: labels.tools },
              { href: `/${locale}/blog`, label: labels.blog },
              { href: `/${locale}/search`, label: labels.search },
            ]}
          />

          <FooterList
            title={labels.sitemap}
            items={[
              { href: "/sitemap.xml", label: labels.sitemapXml },
              { href: "/robots.txt", label: labels.robots },
              { href: "/feed/rss", label: labels.rss },
              { href: `/${locale}/best-ai-tools`, label: labels.bestAiTools },
              { href: `/${locale}/trending-ai-tools`, label: labels.trendingAiTools },
            ]}
          />
        </div>

        <div className="mt-10 border-t border-slate-200/60 pt-6 text-xs text-slate-400">
          {`Copyright ${year} ToolsDdar`}
        </div>
      </div>
    </footer>
  );
}

function FooterList({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
        {items.map((item) => (
          <li key={`${title}-${item.href}`}>
            <Link href={item.href} className="transition-colors hover:text-emerald-600">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
