import { getTranslations } from "next-intl/server";

export async function ArchitectureSection() {
  const t = await getTranslations("landing.architecture");

  return (
    <section className="px-6 py-20" id="architecture">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-10 overflow-x-auto rounded-xl border bg-card p-6 font-mono text-xs sm:text-sm">
          <pre className="text-muted-foreground">{`                AI Tool Platform
                     Database
                         │
     ┌────────────┬──────────────┬────────────┬────────────┐
     ▼            ▼              ▼            ▼            ▼
   Website    REST API v1    MCP Server    Webhook Hub    SDK`}</pre>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["web", "api", "worker", "open"] as const).map((key) => (
            <li key={key} className="rounded-lg border p-4 text-center">
              <p className="font-medium">{t(`layers.${key}.title`)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(`layers.${key}.desc`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
