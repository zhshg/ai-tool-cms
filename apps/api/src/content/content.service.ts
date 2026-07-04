import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import type { MergeDuplicateToolsDto } from "./dto/content-ops.dto";

type ToolWithContent = Prisma.ToolGetPayload<{
  include: typeof contentToolInclude;
}>;

const contentToolInclude = {
  categories: { where: activeOnly, include: { category: true } },
  tags: { where: activeOnly, include: { tag: true } },
  pricingPlans: { where: activeOnly },
  faqs: { where: activeOnly },
  toolScreenshots: true,
  websiteMonitors: {
    where: activeOnly,
    orderBy: { updatedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.ToolInclude;

const REPORT_LIMIT = 50;

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDatasetDashboard() {
    const [tools, duplicateGroups] = await Promise.all([this.loadTools(), this.detectDuplicates()]);

    const missing = this.buildMissingReports(tools);
    const broken = this.buildBrokenWebsiteReport(tools);
    const scores = tools.map((tool) => this.computeContentScore(tool));
    const total = tools.length;
    const published = tools.filter((tool) => tool.status === ToolStatus.PUBLISHED).length;

    return {
      generatedAt: new Date().toISOString(),
      targets: {
        initial: 500,
        ready: 2000,
        scale: 10000,
      },
      summary: {
        totalTools: total,
        publishedTools: published,
        draftTools: tools.filter((tool) => tool.status === ToolStatus.DRAFT).length,
        inReviewTools: tools.filter((tool) => tool.status === ToolStatus.IN_REVIEW).length,
        archivedTools: tools.filter((tool) => tool.status === ToolStatus.ARCHIVED).length,
        architectureReadyFor2000: true,
        scalableTo10000: true,
        averageContentScore: scores.length
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : 0,
      },
      coverage: {
        logo: coverage(total, total - missing.missingLogo.total),
        description: coverage(total, total - missing.missingDescription.total),
        features: coverage(total, total - missing.missingFeatures.total),
        faq: coverage(total, total - missing.missingFaq.total),
        screenshots: coverage(total, total - missing.missingScreenshots.total),
        seo: coverage(total, total - missing.missingSeo.total),
      },
      issues: {
        duplicateGroups: duplicateGroups.totalGroups,
        duplicateTools: duplicateGroups.totalTools,
        missingLogo: missing.missingLogo.total,
        missingDescription: missing.missingDescription.total,
        missingFeatures: missing.missingFeatures.total,
        missingFaq: missing.missingFaq.total,
        brokenWebsites: broken.total,
      },
      missing,
      brokenWebsites: broken,
      duplicates: duplicateGroups,
    };
  }

  async detectDuplicates() {
    const tools = await this.loadTools();
    const groups = [
      ...this.groupDuplicates(tools, "website", (tool) => normalizeWebsite(tool.website)),
      ...this.groupDuplicates(tools, "slug", (tool) => tool.slug.toLowerCase()),
      ...this.groupDuplicates(tools, "name", (tool) => normalizeName(tool.name)),
    ];

    const uniqueGroups = dedupeDuplicateGroups(groups);

    return {
      totalGroups: uniqueGroups.length,
      totalTools: uniqueGroups.reduce((sum, group) => sum + group.tools.length, 0),
      groups: uniqueGroups.slice(0, REPORT_LIMIT),
    };
  }

  async getMissingContentReport() {
    return this.buildMissingReports(await this.loadTools());
  }

  async getBrokenWebsiteReport() {
    return this.buildBrokenWebsiteReport(await this.loadTools());
  }

  async mergeDuplicate(dto: MergeDuplicateToolsDto, actorId: string) {
    if (dto.sourceToolId === dto.targetToolId) {
      throw new BadRequestException("Source and target tools must be different.");
    }

    const [source, target] = await Promise.all([
      this.prisma.client.tool.findFirst({
        where: { id: dto.sourceToolId, ...activeOnly },
        include: contentToolInclude,
      }),
      this.prisma.client.tool.findFirst({
        where: { id: dto.targetToolId, ...activeOnly },
        include: contentToolInclude,
      }),
    ]);

    if (!source) throw new NotFoundException("Source tool not found");
    if (!target) throw new NotFoundException("Target tool not found");

    const mergedMetadata = {
      ...((source.metadata ?? {}) as Record<string, unknown>),
      ...((target.metadata ?? {}) as Record<string, unknown>),
      mergedDuplicateToolIds: [
        ...normalizeStringList(
          (target.metadata as Record<string, unknown>)?.mergedDuplicateToolIds,
        ),
        source.id,
      ],
    };

    await this.prisma.client.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id: target.id },
        data: {
          summary: target.summary || source.summary,
          description: target.description || source.description,
          longDescription: target.longDescription || source.longDescription,
          logoUrl: target.logoUrl || source.logoUrl,
          metaTitle: target.metaTitle || source.metaTitle,
          metaDescription: target.metaDescription || source.metaDescription,
          metadata: mergedMetadata as Prisma.InputJsonValue,
          updatedById: actorId,
        },
      });

      for (const item of source.categories) {
        await tx.toolCategory.upsert({
          where: { toolId_categoryId: { toolId: target.id, categoryId: item.categoryId } },
          update: { deletedAt: null, isPrimary: item.isPrimary },
          create: {
            toolId: target.id,
            categoryId: item.categoryId,
            isPrimary: !target.categories.some((category) => category.isPrimary) && item.isPrimary,
          },
        });
      }

      for (const item of source.tags) {
        await tx.toolTag.upsert({
          where: { toolId_tagId: { toolId: target.id, tagId: item.tagId } },
          update: { deletedAt: null },
          create: { toolId: target.id, tagId: item.tagId },
        });
      }

      const targetQuestions = new Set(
        target.faqs.map((faq) => faq.question.trim().toLowerCase()).filter(Boolean),
      );
      for (const [index, faq] of source.faqs.entries()) {
        const questionKey = faq.question.trim().toLowerCase();
        if (!questionKey || targetQuestions.has(questionKey)) continue;
        await tx.faq.create({
          data: {
            toolId: target.id,
            slug: `${faq.slug}-${source.slug}`.slice(0, 120),
            question: faq.question,
            answer: faq.answer,
            sortOrder: target.faqs.length + index,
            createdById: actorId,
            updatedById: actorId,
          },
        });
      }

      await tx.tool.update({
        where: { id: source.id },
        data: {
          status: ToolStatus.ARCHIVED,
          updatedById: actorId,
          metadata: {
            ...((source.metadata ?? {}) as Record<string, unknown>),
            duplicateMergedIntoToolId: target.id,
            duplicateMergedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    });

    return {
      sourceToolId: source.id,
      targetToolId: target.id,
      status: "merged",
    };
  }

  private async loadTools() {
    return this.prisma.client.tool.findMany({
      where: activeOnly,
      include: contentToolInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  private buildMissingReports(tools: ToolWithContent[]) {
    return {
      missingLogo: this.buildMissingReport(tools, (tool) => !hasLogo(tool), "Missing logo"),
      missingDescription: this.buildMissingReport(
        tools,
        (tool) => !tool.summary?.trim() || !getLongDescription(tool),
        "Missing short or full description",
      ),
      missingFeatures: this.buildMissingReport(
        tools,
        (tool) =>
          normalizeStringList((tool.metadata as Record<string, unknown>)?.features).length === 0,
        "Missing features",
      ),
      missingFaq: this.buildMissingReport(tools, (tool) => tool.faqs.length === 0, "Missing FAQ"),
      missingScreenshots: this.buildMissingReport(
        tools,
        (tool) => getScreenshots(tool).length === 0,
        "Missing screenshots",
      ),
      missingSeo: this.buildMissingReport(
        tools,
        (tool) => !tool.metaTitle?.trim() || !tool.metaDescription?.trim(),
        "Missing SEO title or description",
      ),
      missingCategories: this.buildMissingReport(
        tools,
        (tool) => tool.categories.length === 0 || !tool.categories.some((item) => item.isPrimary),
        "Missing primary category",
      ),
      missingTags: this.buildMissingReport(tools, (tool) => tool.tags.length === 0, "Missing tags"),
      missingPricing: this.buildMissingReport(
        tools,
        (tool) => !tool.pricingModel && tool.pricingPlans.length === 0,
        "Missing pricing",
      ),
      missingUseCases: this.buildMissingReport(
        tools,
        (tool) =>
          normalizeStringList((tool.metadata as Record<string, unknown>)?.useCases).length === 0,
        "Missing use cases",
      ),
      missingAlternatives: this.buildMissingReport(
        tools,
        (tool) =>
          normalizeStringList((tool.metadata as Record<string, unknown>)?.alternatives).length ===
          0,
        "Missing alternatives",
      ),
    };
  }

  private buildMissingReport(
    tools: ToolWithContent[],
    predicate: (tool: ToolWithContent) => boolean,
    reason: string,
  ) {
    const items = tools.filter(predicate).map((tool) => toToolSummary(tool, reason));
    return {
      total: items.length,
      items: items.slice(0, REPORT_LIMIT),
    };
  }

  private buildBrokenWebsiteReport(tools: ToolWithContent[]) {
    const items = tools.flatMap((tool) => {
      const invalidReason = getInvalidWebsiteReason(tool.website);
      if (invalidReason) return [toToolSummary(tool, invalidReason)];

      const brokenMonitor = tool.websiteMonitors.find((monitor) => {
        const metadata = (monitor.metadata ?? {}) as Record<string, unknown>;
        return (
          monitor.status === "ERROR" ||
          metadata.lastStatus === "broken" ||
          metadata.lastStatus === "failed" ||
          (typeof metadata.lastHttpStatus === "number" && metadata.lastHttpStatus >= 400)
        );
      });

      if (!brokenMonitor) return [];

      return [
        toToolSummary(
          tool,
          `Website monitor reported ${brokenMonitor.status.toLowerCase()} status`,
        ),
      ];
    });

    return {
      total: items.length,
      items: items.slice(0, REPORT_LIMIT),
      note: "Broken website detection uses URL validation and existing WebsiteMonitor status. It does not scrape website content.",
    };
  }

  private groupDuplicates(
    tools: ToolWithContent[],
    reason: string,
    keyFn: (tool: ToolWithContent) => string,
  ) {
    const groups = new Map<string, ToolWithContent[]>();

    for (const tool of tools) {
      const key = keyFn(tool);
      if (!key) continue;
      const group = groups.get(key) ?? [];
      group.push(tool);
      groups.set(key, group);
    }

    return Array.from(groups.entries())
      .filter(([, groupedTools]) => groupedTools.length > 1)
      .map(([key, groupedTools]) => ({
        reason,
        key,
        tools: groupedTools.map((tool) => toToolSummary(tool, `Duplicate ${reason}`)),
      }));
  }

  private computeContentScore(tool: ToolWithContent) {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const checks = [
      Boolean(tool.name),
      Boolean(tool.slug),
      Boolean(tool.website),
      hasLogo(tool),
      Boolean(tool.summary?.trim()),
      Boolean(getLongDescription(tool)),
      tool.categories.some((item) => item.isPrimary),
      tool.categories.length > 0,
      tool.tags.length > 0,
      Boolean(tool.pricingModel) || tool.pricingPlans.length > 0,
      normalizeStringList(metadata.platforms ?? metadata.aiPlatforms).length > 0,
      normalizeStringList(metadata.languages ?? metadata.aiLanguages).length > 0,
      typeof metadata.hasApi === "boolean" || typeof metadata.apiAccess === "boolean",
      typeof metadata.openSource === "boolean" || typeof metadata.isOpenSource === "boolean",
      normalizeStringList(metadata.features).length > 0,
      normalizeStringList(metadata.useCases).length > 0,
      getScreenshots(tool).length > 0,
      tool.faqs.length > 0,
      normalizeStringList(metadata.alternatives).length > 0,
      Boolean(tool.metaTitle?.trim()) && Boolean(tool.metaDescription?.trim()),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
}

function coverage(total: number, covered: number) {
  return {
    covered,
    missing: Math.max(total - covered, 0),
    percent: total ? Math.round((covered / total) * 100) : 0,
  };
}

function hasLogo(tool: ToolWithContent) {
  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  return Boolean(
    tool.logoUrl?.trim() ||
    stringValue(metadata.logoUrl) ||
    stringValue(metadata.logo) ||
    stringValue(metadata.collectedLogoUrl),
  );
}

function getLongDescription(tool: ToolWithContent) {
  return tool.longDescription?.trim() || tool.description?.trim() || "";
}

function getScreenshots(tool: ToolWithContent) {
  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const metadataScreenshots = normalizeStringList(metadata.screenshots);
  return [
    ...tool.toolScreenshots.map((screenshot) => screenshot.storageKey || screenshot.targetUrl),
    ...metadataScreenshots,
  ].filter(Boolean);
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function toToolSummary(tool: ToolWithContent, reason: string) {
  return {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    website: tool.website,
    status: tool.status,
    reason,
    updatedAt: tool.updatedAt.toISOString(),
  };
}

function normalizeWebsite(website: string) {
  try {
    const url = new URL(website);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return website.trim().toLowerCase();
  }
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function getInvalidWebsiteReason(website: string) {
  try {
    const url = new URL(website);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Website URL must use http or https";
    }
    if (!url.hostname.includes(".")) return "Website URL hostname is incomplete";
    return null;
  } catch {
    return "Website URL is invalid";
  }
}

function dedupeDuplicateGroups(
  groups: Array<{
    reason: string;
    key: string;
    tools: Array<ReturnType<typeof toToolSummary>>;
  }>,
) {
  const seen = new Set<string>();
  return groups.filter((group) => {
    const signature = group.tools
      .map((tool) => tool.id)
      .sort()
      .join(":");
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
