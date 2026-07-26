import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.docs");

  const sections = [
    { id: "getting-started", title: t("sections.gettingStarted"), href: "/docs/GettingStarted.md" },
    { id: "api", title: t("sections.api"), href: "/docs/API.md" },
    { id: "deployment", title: t("sections.deployment"), href: "/docs/Deployment.md" },
    { id: "architecture", title: t("sections.architecture"), href: "/docs/Architecture.md" },
  ];

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-10 space-y-6">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="rounded-lg border p-6">
            <h2 className="font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("githubHint")}</p>
            <a
              href={`https://github.com/zhshg/ai-tool-cms/blob/main${section.href}`}
              className="mt-3 inline-block text-sm font-medium underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {section.href}
            </a>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="underline">
          {locale === "zh" ? "返回首页" : "Back home"}
        </Link>
      </p>
    </main>
  );
}
