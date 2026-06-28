import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const releases = [
  { version: "1.0.0", date: "2026-06-27", tag: "GA" },
  { version: "1.0.0-prod.1", date: "2026-06-27", tag: "Production" },
  { version: "1.0.0-rc.1", date: "2026-06-27", tag: "RC" },
] as const;

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.changelog");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-10 space-y-8">
          {releases.map((release) => (
            <article key={release.version} className="border-l-2 pl-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">v{release.version}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{release.tag}</span>
              </div>
              <time className="text-sm text-muted-foreground">{release.date}</time>
              <p className="mt-2 text-sm">{t(`releases.${release.version.replace(/\./g, "_")}`)}</p>
            </article>
          ))}
        </div>
        <a
          href="https://github.com/zhshg/ai-tool-cms/blob/main/CHANGELOG.md"
          className="mt-8 inline-block text-sm underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          CHANGELOG.md
        </a>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
