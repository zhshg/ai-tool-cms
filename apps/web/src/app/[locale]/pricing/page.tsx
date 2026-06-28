import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.pricing");

  const tiers = ["oss", "selfHosted", "enterprise"] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="mx-auto max-w-6xl flex-1 px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier}
              className={`rounded-xl border p-6 ${tier === "selfHosted" ? "border-foreground shadow-md" : ""}`}
            >
              <h2 className="font-semibold">{t(`tiers.${tier}.name`)}</h2>
              <p className="mt-2 text-3xl font-bold">{t(`tiers.${tier}.price`)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t(`tiers.${tier}.desc`)}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {(t.raw(`tiers.${tier}.features`) as string[]).map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={tier === "selfHosted" ? "default" : "outline"}
                asChild
              >
                <Link href={`/${locale}/docs`}>{t("cta")}</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
