import { getTranslations } from "next-intl/server";

const screenshots = [
  { key: "admin", alt: "Admin Dashboard" },
  { key: "seo", alt: "SEO Dashboard" },
  { key: "api", alt: "API Documentation" },
] as const;

export async function ScreenshotsSection() {
  const t = await getTranslations("landing.screenshots");

  return (
    <section className="px-6 py-20" id="screenshots">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {screenshots.map(({ key, alt }) => (
            <div
              key={key}
              className="overflow-hidden rounded-xl border bg-gradient-to-b from-muted to-card shadow-sm"
            >
              <div className="flex aspect-video items-center justify-center bg-muted/50">
                <span className="text-sm text-muted-foreground">{alt}</span>
              </div>
              <p className="p-4 text-center text-sm font-medium">{t(`items.${key}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
