import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

type HeroSectionProps = {
  locale: string;
};

export async function HeroSection({ locale }: HeroSectionProps) {
  const t = await getTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden px-6 py-20 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted via-background to-background" />
      <div className="relative mx-auto max-w-3xl space-y-6">
        <p className="inline-flex rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {t("badge")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">{t("title")}</h1>
        <p className="text-lg text-muted-foreground sm:text-xl">{t("subtitle")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button size="lg" asChild>
            <Link href={`/${locale}/docs`}>{t("ctaPrimary")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/zhshg/ai-tool-cms"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("ctaSecondary")}
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("stats")}</p>
      </div>
    </section>
  );
}
