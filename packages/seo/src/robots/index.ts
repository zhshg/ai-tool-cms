import type { RobotsOptions } from "../types";
import { getSiteConfig, type SiteConfig } from "../site-config";
import { joinUrl } from "../utils";

export function buildRobots(
  options: RobotsOptions = {},
  config: SiteConfig = getSiteConfig(),
): string {
  const lines: string[] = ["User-agent: *"];

  const allow = normalizeList(options.allow);
  const disallow = normalizeList(options.disallow ?? ["/api/", "/admin/"]);

  if (config.adminUrl) {
    try {
      const adminPath = new URL(config.adminUrl).pathname;
      if (adminPath && adminPath !== "/") disallow.push(`${adminPath}*`);
    } catch {
      /* ignore */
    }
  }

  for (const rule of allow) lines.push(`Allow: ${rule}`);
  for (const rule of [...new Set(disallow)]) lines.push(`Disallow: ${rule}`);

  if (options.noIndex ?? config.robotsNoIndex) {
    lines.push("Disallow: /");
  }

  const sitemapUrl = options.sitemapIndexUrl ?? joinUrl(config.siteUrl, "/sitemap.xml");
  lines.push("", `Sitemap: ${sitemapUrl}`);

  return `${lines.join("\n")}\n`;
}

function normalizeList(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
