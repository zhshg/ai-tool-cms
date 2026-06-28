export type {
  BreadcrumbItem,
  CollectionPageInput,
  ComparePageKind,
  ComparePageSpec,
  FeedItem,
  HreflangAlternate,
  InternalLink,
  InternalLinkType,
  ItemListInput,
  FaqPageInput,
  RobotsOptions,
  SearchConsoleMetrics,
  SeoHealthIssue,
  SeoHealthReport,
  SeoPageInput,
  SitemapChunk,
  SitemapChunkId,
  SitemapEntry,
  SoftwareApplicationInput,
} from "./types";

export { getSiteConfig, type SiteConfig } from "./site-config";
export {
  escapeXml,
  joinUrl,
  normalizeUrl,
  resolveAbsoluteUrl,
  slugPairKey,
  toIsoDate,
} from "./utils";

export { buildMetadata, buildToolMetadata, type BuiltMetadata } from "./metadata";
export {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildSoftwareApplicationJsonLd,
  buildToolPageJsonLd,
  serializeJsonLd,
  type JsonLd,
} from "./schema";

export {
  buildSitemapEntries,
  buildSitemapXml,
  buildSitemapIndex,
  buildSitemapIndexXml,
  chunkToXml,
  pingSearchEngines,
  SITEMAP_CHUNK_IDS,
  defaultSitemapEntries,
  buildSitemap,
} from "./sitemap";

export { buildRobots } from "./robots";

export { buildAtomFeed, buildJsonFeed, buildPublicApiFeed, buildRssFeed } from "./rss";

export {
  PRESET_COMPARE_PAGES,
  buildAlternativesPagePath,
  buildCategoryPagePath,
  buildComparePagePath,
  buildTagPagePath,
  buildToolInternalLinks,
  generateAlternativesPages,
  generateToolVsPages,
  type ToolLinkContext,
} from "./internal-links";

export {
  buildCategoryLandingMetadata,
  buildComparePageJsonLd,
  buildComparePageMetadata,
  buildTagLandingMetadata,
} from "./compare";

export { scoreSeoHealth, type SeoScoringInput } from "./scoring";
export { buildGeoSeoHints, type GeoSeoHints } from "./geo";
export { pingSitemapsAfterPublish, syncComparePages, syncInternalLinks } from "./sync";
