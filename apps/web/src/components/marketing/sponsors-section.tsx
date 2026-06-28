import { getTranslations } from "next-intl/server";

export async function SponsorsSection() {
  const t = await getTranslations("landing.sponsors");

  return (
    <section className="border-t px-6 py-16" id="sponsors">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t("title")}
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 opacity-60">
          {["OpenAI", "Vercel", "PostgreSQL", "Redis"].map((name) => (
            <span key={name} className="text-lg font-semibold text-muted-foreground">
              {name}
            </span>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{t("cta")}</p>
      </div>
    </section>
  );
}
