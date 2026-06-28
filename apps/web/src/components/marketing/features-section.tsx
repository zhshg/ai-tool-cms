import { Bot, Globe, Search, Shield, Sparkles, Workflow } from "lucide-react";
import { getTranslations } from "next-intl/server";

const icons = [Bot, Search, Sparkles, Globe, Workflow, Shield] as const;

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");
  const items = ["ai", "search", "seo", "i18n", "workflow", "security"] as const;

  return (
    <section className="border-t bg-muted/20 px-6 py-20" id="features">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((key, i) => {
            const Icon = icons[i]!;
            return (
              <div
                key={key}
                className="rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md"
              >
                <Icon className="h-8 w-8 text-foreground" />
                <h3 className="mt-4 font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`items.${key}.desc`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
