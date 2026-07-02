import Link from "next/link";

type SiteFooterProps = {
  locale: string;
};

export async function SiteFooter({ locale }: SiteFooterProps) {
  const labels =
    locale === "zh"
      ? {
          tagline: "发现、比较并追踪值得使用的 AI 工具。",
          directory: "目录",
          allTools: "全部工具",
          categories: "热门分类",
          search: "搜索工具",
          content: "内容",
          blog: "博客与指南",
          updates: "更新",
          weekly: "每周精选",
        }
      : {
          tagline: "Discover, compare, and track AI tools worth using.",
          directory: "Directory",
          allTools: "All tools",
          categories: "Popular categories",
          search: "Search tools",
          content: "Content",
          blog: "Blog and guides",
          updates: "Updates",
          weekly: "Weekly picks",
        };

  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <p className="font-semibold">AI Tool Directory</p>
            <p className="text-sm text-muted-foreground">{labels.tagline}</p>
          </div>

          <div>
            <p className="text-sm font-medium">{labels.directory}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/tools`} className="hover:text-foreground">
                  {labels.allTools}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}#categories`} className="hover:text-foreground">
                  {labels.categories}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/search`} className="hover:text-foreground">
                  {labels.search}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium">{labels.content}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-foreground">
                  {labels.blog}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/category/ai-writing`} className="hover:text-foreground">
                  AI Writing
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/category/code-assistant`} className="hover:text-foreground">
                  Code Assistant
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium">{labels.updates}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/feed/rss" className="hover:text-foreground">
                  RSS
                </Link>
              </li>
              <li>
                <Link href={`/${locale}#newsletter`} className="hover:text-foreground">
                  {labels.weekly}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">{`© ${year} AI Tool Directory`}</p>
      </div>
    </footer>
  );
}
