import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { startAiPipeline } from "@ai-tool-cms/ai";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";
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
const QUALITY_RANKING_LIMIT = 25;

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

  async getQualityDashboard() {
    const tools = await this.loadTools();
    const items = tools.map((tool) => this.computeQualityProfile(tool));
    const sortedByQuality = [...items].sort((a, b) => a.contentScore - b.contentScore);
    const topMissingContent = sortedByQuality
      .filter((item) => item.missing.length > 0)
      .slice(0, QUALITY_RANKING_LIMIT);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTools: items.length,
        averageContentScore: average(items.map((item) => item.contentScore)),
        averageSeoScore: average(items.map((item) => item.seoScore)),
        averageCompletenessScore: average(items.map((item) => item.completenessScore)),
        averageReadability: average(items.map((item) => item.readability)),
        excellentTools: items.filter((item) => item.contentScore >= 90).length,
        needsImprovement: items.filter((item) => item.contentScore < 70).length,
      },
      topMissingContent,
      qualityRanking: sortedByQuality.slice(0, QUALITY_RANKING_LIMIT),
      bestQuality: [...items]
        .sort((a, b) => b.contentScore - a.contentScore)
        .slice(0, QUALITY_RANKING_LIMIT),
      metrics: this.buildQualityMetricSummary(items),
    };
  }

  async bulkImprove(toolIds: string[] | undefined, actorId: string) {
    const requestedIds = [...new Set(toolIds ?? [])].filter(Boolean);
    const tools = requestedIds.length
      ? await this.prisma.client.tool.findMany({
          where: { id: { in: requestedIds }, ...activeOnly },
          select: { id: true },
        })
      : (await this.loadTools())
          .map((tool) => this.computeQualityProfile(tool))
          .filter((profile) => profile.contentScore < 80 || profile.missing.length > 0)
          .slice(0, QUALITY_RANKING_LIMIT)
          .map((profile) => ({ id: profile.id }));

    const results: Array<{ toolId: string; pipelineRunId: string; jobId: string }> = [];
    for (const tool of tools) {
      const result = await startAiPipeline(
        tool.id,
        (queue, job, payload) => enqueueAiJob(queue as AiQueueName, job, payload),
        actorId,
      );
      results.push({ toolId: tool.id, ...result });
    }

    return { queued: results.length, results };
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
    return this.computeQualityProfile(tool).contentScore;
  }

  private computeQualityProfile(tool: ToolWithContent) {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const description = getLongDescription(tool);
    const features = normalizeStringList(metadata.features);
    const screenshots = getScreenshots(tool);
    const alternatives = normalizeStringList(metadata.alternatives);
    const useCases = normalizeStringList(metadata.useCases);

    const breakdown = {
      logo: scoreBoolean(hasLogo(tool), "Logo is available", "Missing logo"),
      description: scoreDescription(tool.summary, description),
      features: scoreCount(features.length, 3, "Feature list"),
      faq: scoreCount(tool.faqs.length, 3, "FAQ"),
      screenshots: scoreCount(screenshots.length, 2, "Screenshots"),
      seo: scoreSeo(tool),
      pricing: scoreBoolean(
        Boolean(tool.pricingModel) || tool.pricingPlans.length > 0,
        "Pricing is defined",
        "Missing pricing",
      ),
      alternatives: scoreCount(alternatives.length, 3, "Alternatives"),
      category: scoreBoolean(
        tool.categories.some((item) => item.isPrimary),
        "Primary category is assigned",
        "Missing primary category",
      ),
      tags: scoreCount(tool.tags.length, 3, "Tags"),
      useCases: scoreCount(useCases.length, 3, "Use cases"),
    };

    const completenessScore = Math.round(
      average(Object.values(breakdown).map((item) => item.score)),
    );
    const seoScore = breakdown.seo.score;
    const readability = scoreReadability(`${tool.summary ?? ""} ${description}`);
    const contentScore = Math.round(completenessScore * 0.5 + seoScore * 0.25 + readability * 0.25);
    const missing = Object.entries(breakdown)
      .filter(([, value]) => value.score < 70)
      .map(([key, value]) => ({
        key,
        label: value.label,
        reason: value.reason,
        score: value.score,
      }));

    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      website: tool.website,
      status: tool.status,
      contentScore,
      seoScore,
      completenessScore,
      readability,
      breakdown,
      missing,
      recommendedAction: missing.length
        ? `Improve ${missing
            .slice(0, 3)
            .map((item) => item.label.toLowerCase())
            .join(", ")}`
        : "Ready for launch",
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  private buildQualityMetricSummary(
    items: Array<ReturnType<ContentService["computeQualityProfile"]>>,
  ) {
    const keys = [
      "logo",
      "description",
      "features",
      "faq",
      "screenshots",
      "seo",
      "pricing",
      "alternatives",
    ] as const;

    return Object.fromEntries(
      keys.map((key) => {
        const scores = items.map((item) => item.breakdown[key].score);
        return [
          key,
          {
            averageScore: average(scores),
            passing: scores.filter((score) => score >= 70).length,
            failing: scores.filter((score) => score < 70).length,
          },
        ];
      }),
    );
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

type QualityMetricScore = {
  score: number;
  label: string;
  reason: string;
};

function scoreBoolean(ok: boolean, passReason: string, failReason: string): QualityMetricScore {
  return {
    score: ok ? 100 : 0,
    label: passReason.replace(/^(.+?) is .+$/, "$1"),
    reason: ok ? passReason : failReason,
  };
}

function scoreCount(count: number, target: number, label: string): QualityMetricScore {
  const score = Math.min(100, Math.round((count / target) * 100));
  return {
    score,
    label,
    reason:
      score >= 100
        ? `${label} coverage is strong`
        : `${label} has ${count}/${target} recommended items`,
  };
}

function scoreDescription(summary: string | null, description: string): QualityMetricScore {
  const summaryLength = summary?.trim().length ?? 0;
  const descriptionLength = description.trim().length;
  const score = Math.min(
    100,
    Math.round(
      (summaryLength >= 80 ? 35 : (summaryLength / 80) * 35) +
        (descriptionLength >= 400 ? 65 : (descriptionLength / 400) * 65),
    ),
  );
  return {
    score,
    label: "Description",
    reason:
      score >= 80
        ? "Description is detailed enough"
        : "Short or full description needs more original detail",
  };
}

function scoreSeo(tool: ToolWithContent): QualityMetricScore {
  const titleLength = tool.metaTitle?.trim().length ?? 0;
  const descriptionLength = tool.metaDescription?.trim().length ?? 0;
  const titleScore = titleLength >= 35 && titleLength <= 70 ? 50 : titleLength > 0 ? 25 : 0;
  const descriptionScore =
    descriptionLength >= 120 && descriptionLength <= 170 ? 50 : descriptionLength > 0 ? 25 : 0;
  const score = titleScore + descriptionScore;
  return {
    score,
    label: "SEO",
    reason:
      score >= 80
        ? "SEO title and description are launch-ready"
        : "SEO title or description is missing or outside recommended length",
  };
}

function scoreReadability(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  const words = normalized.split(" ").filter(Boolean);
  const sentences = normalized.split(/[.!?������]+/).filter((item) => item.trim()).length || 1;
  const averageWordsPerSentence = words.length / sentences;
  const lengthScore = Math.min(100, Math.round((words.length / 120) * 100));
  const sentenceScore =
    averageWordsPerSentence <= 24
      ? 100
      : Math.max(40, 100 - Math.round((averageWordsPerSentence - 24) * 3));
  return Math.round(lengthScore * 0.45 + sentenceScore * 0.55);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
