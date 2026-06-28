import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export async function GithubSection() {
  const t = await getTranslations("landing.github");

  return (
    <section className="bg-muted/20 px-6 py-20" id="github">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold">MIT</p>
            <p className="text-muted-foreground">{t("license")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">37+</p>
            <p className="text-muted-foreground">{t("packages")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">12</p>
            <p className="text-muted-foreground">{t("sprints")}</p>
          </div>
        </div>
        <Button className="mt-8" size="lg" asChild>
          <a href="https://github.com/zhshg/ai-tool-cms" target="_blank" rel="noopener noreferrer">
            {t("cta")}
          </a>
        </Button>
      </div>
    </section>
  );
}
