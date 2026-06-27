export { buildMetadata } from "./metadata";
export {
  buildBreadcrumbJsonLd,
  buildSoftwareApplicationJsonLd,
  serializeJsonLd,
} from "./json-ld";
export type { JsonLd } from "./json-ld";
export { buildRobots } from "./robots";
export { buildSitemap, defaultSitemapEntries } from "./sitemap";
export { getSiteConfig } from "./site-config";
export type { SiteConfig } from "./site-config";
export type {
  BreadcrumbItem,
  RobotsOptions,
  SeoPageInput,
  SitemapEntry,
  SoftwareApplicationInput,
} from "./types";
export { joinUrl, normalizeUrl, resolveAbsoluteUrl } from "./utils";
