import type { MetadataRoute } from "next";
import { getSiteConfig } from "./site-config";
import type { RobotsOptions } from "./types";

function toRuleList(value: string | string[] | undefined): string | string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value;
}

export function buildRobots(
  options: RobotsOptions = {},
  config = getSiteConfig(),
): MetadataRoute.Robots {
  const sitemap = `${config.siteUrl}/sitemap.xml`;
  const shouldNoIndex = options.noIndex ?? config.robotsNoIndex;

  if (shouldNoIndex) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: toRuleList(options.allow) ?? "/",
      disallow: toRuleList(options.disallow) ?? ["/api/"],
    },
    sitemap,
    host: config.siteUrl,
  };
}
