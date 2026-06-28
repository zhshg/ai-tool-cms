/** BCP 47 locale codes — extensible to 50+ (Commit 071). */
export const SUPPORTED_LOCALES = [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "es",
  "de",
  "fr",
  "pt-BR",
  "ru",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  "pt-BR": "Português (BR)",
  ru: "Русский",
};

/** Regional path prefixes for SEO (Commit 073). */
export const REGION_LOCALE_MAP: Record<string, SupportedLocale> = {
  us: "en",
  jp: "ja",
  de: "de",
  tw: "zh-TW",
  cn: "zh-CN",
  kr: "ko",
  es: "es",
  fr: "fr",
  br: "pt-BR",
  ru: "ru",
};

export function parseEnabledLocales(raw?: string): SupportedLocale[] {
  if (!raw?.trim()) {
    return [...SUPPORTED_LOCALES];
  }
  const parts = raw.split(",").map((s) => s.trim());
  return parts.filter((l): l is SupportedLocale =>
    (SUPPORTED_LOCALES as readonly string[]).includes(l),
  );
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localeToUrlSegment(locale: string): string {
  return locale;
}

export function detectLocaleFromHeader(acceptLanguage?: string): SupportedLocale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }
  const parts = acceptLanguage.split(",").map((p) => p.split(";")[0]?.trim().toLowerCase());
  for (const part of parts) {
    if (!part) continue;
    const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === part);
    if (exact) return exact;
    const lang = part.split("-")[0];
    const match = SUPPORTED_LOCALES.find((l) => l.toLowerCase().startsWith(lang ?? ""));
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function regionForLocale(locale: SupportedLocale): string | undefined {
  const entry = Object.entries(REGION_LOCALE_MAP).find(([, l]) => l === locale);
  return entry?.[0];
}
