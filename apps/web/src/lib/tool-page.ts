import { prisma, ToolStatus } from "@ai-tool-cms/database";
import { buildGeoContentBlocks, type GeoPageDocument } from "@ai-tool-cms/geo";
import {
  buildToolMetadata,
  buildToolPageJsonLd,
  getSiteConfig,
  joinUrl,
  type BuiltMetadata,
} from "@ai-tool-cms/seo";

const activeOnly = { deletedAt: null } as const;

export type ToolPageLink = {
  anchor: string;
  href: string;
  type: string;
};

type ToolFaqRow = {
  question: string;
  answer: string;
};

type ToolInternalLinkRow = {
  anchorText: string;
  href: string;
  linkType: string;
};

export type ToolPageData = {
  slug: string;
  name: string;
  website: string;
  summary: string | null;
  longDescription: string | null;
  aiSummary: string;
  pros: string[];
  cons: string[];
  useCases: string[];
  faqs: Array<{ question: string; answer: string }>;
  internalLinks: ToolPageLink[];
  geoBlocks: ReturnType<typeof buildGeoContentBlocks>;
  jsonLd: Record<string, unknown>[];
};

export async function getToolPage(
  slug: string,
  locale: string,
): Promise<{ metadata: BuiltMetadata; data: ToolPageData } | null> {
  const tool = await prisma.tool.findFirst({
    where: { slug, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true }, take: 1 },
      faqs: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 10 },
      internalLinks: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 24 },
    },
  });
  if (!tool) return null;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const geoDocument = metadata.geoDocument as GeoPageDocument | undefined;
  const geoBlocks = geoDocument ? buildGeoContentBlocks(geoDocument) : [];

  const pros = (metadata.aiPros as string[] | undefined) ?? [];
  const cons = (metadata.aiCons as string[] | undefined) ?? [];
  const useCases = (metadata.aiUseCases as string[] | undefined) ?? [];
  const features = metadata.aiFeatures as string[] | undefined;

  const aiSummary =
    geoDocument?.llmSummary ??
    tool.summary ??
    tool.description ??
    `${tool.name} is an AI tool listed in our directory.`;

  const config = getSiteConfig();
  const primaryCategory = tool.categories[0]?.category;
  const faqs = tool.faqs.map((f: ToolFaqRow) => ({ question: f.question, answer: f.answer }));

  const jsonLd = buildToolPageJsonLd({
    baseUrl: config.siteUrl,
    locale,
    tool: {
      slug: tool.slug,
      name: tool.name,
      description: tool.metaDescription ?? tool.summary ?? undefined,
      url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
      applicationCategory: primaryCategory?.name ?? "BusinessApplication",
      operatingSystem: "Web",
      image: tool.logoUrl ?? undefined,
    },
    breadcrumbs: [
      { name: "Home", path: `/${locale}` },
      ...(primaryCategory
        ? [{ name: primaryCategory.name, path: `/${locale}/category/${primaryCategory.slug}` }]
        : []),
      { name: tool.name, path: `/${locale}/tools/${tool.slug}` },
    ],
    faqs,
  });

  return {
    metadata: buildToolMetadata(tool, locale),
    data: {
      slug: tool.slug,
      name: tool.name,
      website: tool.website,
      summary: tool.summary,
      longDescription: tool.longDescription,
      aiSummary,
      pros,
      cons,
      useCases: useCases.length ? useCases : (features ?? []).slice(0, 5),
      faqs,
      internalLinks: tool.internalLinks.map((link: ToolInternalLinkRow) => ({
        anchor: link.anchorText,
        href: link.href,
        type: link.linkType,
      })),
      geoBlocks,
      jsonLd,
    },
  };
}
