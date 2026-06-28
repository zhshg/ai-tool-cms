import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

type CtaSectionProps = {
  locale: string;
};

export async function CtaSection({ locale }: CtaSectionProps) {
  const t = await getTranslations("landing.cta");

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card px-8 py-12 text-center shadow-sm">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={`/${locale}/docs`}>{t("primary")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={`/${locale}/pricing`}>{t("secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
