import { defineRouting } from "next-intl/routing";

/** Commit 071 — BCP 47 locales, extensible to 50+ */
export const routing = defineRouting({
  locales: ["en", "zh-CN", "zh-TW", "ja", "ko", "es", "de", "fr", "pt-BR", "ru"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: true,
});
