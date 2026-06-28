import Link from "next/link";
import { getTranslations } from "next-intl/server";

type SiteFooterProps = {
  locale: string;
};

export async function SiteFooter({ locale }: SiteFooterProps) {
  const t = await getTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <p className="font-semibold">AI Tool CMS</p>
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{t("product")}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/pricing`} className="hover:text-foreground">
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/showcase`} className="hover:text-foreground">
                  {t("showcase")}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/changelog`} className="hover:text-foreground">
                  {t("changelog")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">{t("resources")}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/docs`} className="hover:text-foreground">
                  {t("docs")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/zhshg/ai-tool-cms"
                  className="hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-foreground">
                  {t("blog")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">{t("community")}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/zhshg/ai-tool-cms/discussions"
                  className="hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discussions
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/zhshg/ai-tool-cms/issues"
                  className="hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Issues
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {year} AI Tool CMS · MIT License · v1.0.0
        </p>
      </div>
    </footer>
  );
}
