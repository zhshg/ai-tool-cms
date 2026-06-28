import Link from "next/link";
import { getTranslations } from "next-intl/server";

type RoadmapSectionProps = {
  locale: string;
};

export async function RoadmapSection({ locale }: RoadmapSectionProps) {
  const t = await getTranslations("landing.roadmap");

  const v11 = ["agent", "prompts", "marketplace", "analytics"] as const;
  const v20 = ["mcp", "workflow", "enterprise", "saas"] as const;

  return (
    <section className="border-t bg-muted/20 px-6 py-20" id="roadmap">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">v1.1</p>
            <ul className="mt-4 space-y-2">
              {v11.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  {t(`v11.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">v2.0</p>
            <ul className="mt-4 space-y-2">
              {v20.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  {t(`v20.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href={`/${locale}/changelog`} className="underline hover:text-foreground">
            {t("changelogLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}
