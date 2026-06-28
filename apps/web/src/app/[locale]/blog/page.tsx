import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const posts = [
  { slug: "v1-ga-launch", date: "2026-06-27" },
  { slug: "open-ecosystem", date: "2026-06-27" },
  { slug: "production-ready", date: "2026-06-27" },
] as const;

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.blog");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        <ul className="mt-10 space-y-6">
          {posts.map((post) => (
            <li key={post.slug} className="rounded-lg border p-6">
              <time className="text-xs text-muted-foreground">{post.date}</time>
              <h2 className="mt-1 font-semibold">{t(`posts.${post.slug}.title`)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`posts.${post.slug}.excerpt`)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm">
          <Link href={`/${locale}`} className="underline text-muted-foreground">
            ← {t("back")}
          </Link>
        </p>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
