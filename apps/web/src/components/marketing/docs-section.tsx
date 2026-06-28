import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

type DocsSectionProps = {
  locale: string;
};

export async function DocsSection({ locale }: DocsSectionProps) {
  const t = await getTranslations("landing.docs");

  const links = [
    { href: `/${locale}/docs`, label: t("gettingStarted") },
    { href: `/${locale}/docs#api`, label: t("api") },
    { href: `/${locale}/docs#deployment`, label: t("deployment") },
  ];

  return (
    <section className="px-6 py-20" id="documentation">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
            <ul className="mt-6 space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-medium hover:underline">
                    → {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Button className="mt-6" asChild>
              <Link href={`/${locale}/docs`}>{t("cta")}</Link>
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-6 font-mono text-xs text-muted-foreground">
            <pre>{`pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm dev:stack

# 30 min to production-ready dev env`}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
