import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const MESSAGE_ALIASES: Record<string, string> = {
  "zh-CN": "zh",
  "zh-TW": "zh",
};

async function loadMessages(locale: string) {
  const file = MESSAGE_ALIASES[locale] ?? locale;
  try {
    return (await import(`../../messages/${file}.json`)).default;
  } catch {
    return (await import("../../messages/en.json")).default;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
