import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { PricingModel, ToolStatus } from "@ai-tool-cms/database";
import { slugify } from "@ai-tool-cms/common";
import { startAiPipeline } from "@ai-tool-cms/ai";
import { emitWebhookEvent } from "@ai-tool-cms/api-platform";
import { enqueueToolLogoCollect } from "@ai-tool-cms/automation";
import { enqueueScreenshotCapture } from "@ai-tool-cms/screenshot";
import { runPluginLifecycle } from "@ai-tool-cms/plugins";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";
import { enqueueSearchIndex } from "@ai-tool-cms/search";
import { GrowthService } from "../growth/growth.service";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import type { BulkUpdateToolsDto, ImportExecuteDto, ImportPreviewDto } from "./dto/content-ops.dto";
import type { CreateToolDto, ToolFaqDto, UpdateToolDto } from "./dto/tool.dto";

const toolInclude = {
  categories: {
    where: activeOnly,
    include: { category: true },
  },
  tags: {
    where: activeOnly,
    include: { tag: true },
  },
  pricingPlans: { where: activeOnly },
} satisfies Prisma.ToolInclude;

const toolDetailInclude = {
  ...toolInclude,
  faqs: {
    where: activeOnly,
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ToolInclude;

type ImportRecord = {
  name: string;
  slug?: string;
  website: string;
  summary?: string;
  description?: string;
  logoUrl?: string;
  pricingModel?: PricingModel;
  status?: ToolStatus;
  categorySlugs: string[];
  tagSlugs: string[];
  features: string[];
  useCases: string[];
  alternatives: string[];
  metaTitle?: string;
  metaDescription?: string;
  languages: string[];
  platforms: string[];
  rawStatus?: string;
};

type ImportRecordDiagnostic = {
  index: number;
  name: string;
  slug: string;
  website: string;
  websiteDomain: string | null;
  categorySlugs: string[];
  existing?: { id: string; slug: string; website: string; name: string } | null;
  duplicateReasons: string[];
  errors: string[];
  warnings: string[];
  missingCategory: boolean;
  missingSeo: boolean;
  valid: boolean;
  duplicate: boolean;
};

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly growth: GrowthService,
  ) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.tool.findMany({
        where: activeOnly,
        include: toolInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.client.tool.count({ where: activeOnly }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        completenessScore: this.computeCompletenessScore(item),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { id, ...activeOnly },
      include: toolDetailInclude,
    });
    if (!tool) throw new NotFoundException("Tool not found");
    return tool;
  }

  async findBySlug(slug: string) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { slug, ...activeOnly },
      include: toolInclude,
    });
    if (!tool) throw new NotFoundException("Tool not found");
    return tool;
  }

  async create(dto: CreateToolDto, actorId: string) {
    this.validateEditorPayload(dto);
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(slug);

    if (!dto.categoryIds?.length) {
      throw new BadRequestException("Primary category is required.");
    }

    const tool = await this.prisma.client.tool.create({
      data: {
        slug,
        name: dto.name,
        website: dto.website,
        description: dto.description,
        summary: dto.summary,
        logoUrl: dto.logoUrl,
        pricingModel: dto.pricingModel,
        status: dto.status ?? ToolStatus.DRAFT,
        publishedAt:
          (dto.status ?? ToolStatus.DRAFT) === ToolStatus.PUBLISHED ? new Date() : undefined,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        createdById: actorId,
        updatedById: actorId,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
      include: toolInclude,
    });

    if (dto.categoryIds?.length) {
      await this.syncCategories(tool.id, dto.categoryIds);
    }
    if (dto.tagIds?.length) {
      await this.syncTags(tool.id, dto.tagIds);
    }
    if (dto.faqs) {
      await this.syncFaqs(tool.id, dto.faqs, actorId);
    }

    if ((dto.status ?? ToolStatus.DRAFT) === ToolStatus.DRAFT) {
      await startAiPipeline(
        tool.id,
        (queue, job, payload) => enqueueAiJob(queue as AiQueueName, job, payload),
        actorId,
      );
    }

    if (dto.status === ToolStatus.PUBLISHED) {
      await enqueueSearchIndex(tool.id, "publish");
      await this.growth.enqueueToolPublished(tool.id, "cms_publish", actorId);
    }

    await runPluginLifecycle(this.prisma.client, "onToolCreated", {
      toolId: tool.id,
      slug: tool.slug,
      metadata: (tool.metadata ?? {}) as Record<string, unknown>,
    });

    return this.findById(tool.id);
  }

  async update(id: string, dto: UpdateToolDto, actorId: string) {
    const existing = await this.findById(id);
    this.validateEditorPayload(dto);

    if (dto.categoryIds && dto.categoryIds.length === 0) {
      throw new BadRequestException("Primary category is required.");
    }

    if (dto.slug) await this.ensureSlugAvailable(slugify(dto.slug), id);

    const mergedMetadata =
      dto.metadata !== undefined
        ? ({
            ...((existing.metadata ?? {}) as Record<string, unknown>),
            ...(dto.metadata as Record<string, unknown>),
          } as Prisma.InputJsonValue)
        : undefined;

    await this.prisma.client.tool.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        website: dto.website,
        description: dto.description,
        summary: dto.summary,
        logoUrl: dto.logoUrl,
        pricingModel: dto.pricingModel,
        status: dto.status,
        publishedAt:
          dto.status === ToolStatus.PUBLISHED
            ? existing.status === ToolStatus.PUBLISHED
              ? existing.publishedAt
              : new Date()
            : dto.status === ToolStatus.DRAFT
              ? null
              : undefined,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        updatedById: actorId,
        metadata: mergedMetadata,
      },
    });

    if (dto.categoryIds) await this.syncCategories(id, dto.categoryIds);
    if (dto.tagIds) await this.syncTags(id, dto.tagIds);
    if (dto.faqs) await this.syncFaqs(id, dto.faqs, actorId);

    if (dto.status === ToolStatus.PUBLISHED && existing.status !== ToolStatus.PUBLISHED) {
      await enqueueSearchIndex(id, "publish");
      await this.growth.enqueueToolPublished(id, "manual_publish", actorId);
    } else if (existing.status === ToolStatus.PUBLISHED) {
      await enqueueSearchIndex(id, "tool_update");
    }

    const updated = await this.findById(id);

    await emitWebhookEvent(this.prisma.client, "TOOL_UPDATED", {
      toolId: id,
      slug: updated.slug,
      name: updated.name,
      status: updated.status,
      actorId,
    });
    await runPluginLifecycle(this.prisma.client, "onToolUpdated", {
      toolId: id,
      slug: updated.slug,
      metadata: (updated.metadata ?? {}) as Record<string, unknown>,
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findById(id);
    const result = await this.prisma.client.tool.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
    });

    await emitWebhookEvent(this.prisma.client, "TOOL_DELETED", {
      toolId: id,
      slug: existing.slug,
      name: existing.name,
      actorId,
    });

    return result;
  }

  async previewImport(dto: ImportPreviewDto) {
    const records = this.parseImportContent(dto.format, dto.content);
    const diagnostics = await this.buildImportDiagnostics(records);

    return {
      format: dto.format,
      total: records.length,
      records: diagnostics,
      valid: diagnostics.filter((item) => item.valid && !item.duplicate).length,
      invalid: diagnostics.filter((item) => !item.valid).length,
      duplicates: diagnostics.filter((item) => item.duplicate).length,
      missingCategory: diagnostics.filter((item) => item.missingCategory).length,
      missingSeo: diagnostics.filter((item) => item.missingSeo).length,
      readyToImport: diagnostics.filter((item) => item.valid && !item.duplicate).length,
    };
  }

  async executeImport(dto: ImportExecuteDto, actorId: string) {
    const records = this.parseImportContent(dto.format, dto.content);
    const diagnostics = await this.buildImportDiagnostics(records);
    const imported: Array<{ id: string; name: string; slug: string }> = [];
    const skipped: Array<{ name: string; slug: string; reason: string }> = [];
    const limit = dto.limit && dto.limit > 0 ? dto.limit : records.length;

    for (const diagnostic of diagnostics.slice(0, limit)) {
      const record = records[diagnostic.index];
      if (!record) continue;

      if (!diagnostic.valid) {
        skipped.push({
          name: diagnostic.name,
          slug: diagnostic.slug,
          reason: diagnostic.errors.join("; "),
        });
        continue;
      }

      if (diagnostic.duplicate) {
        if (dto.skipDuplicates ?? true) {
          skipped.push({
            name: diagnostic.name,
            slug: diagnostic.slug,
            reason: diagnostic.duplicateReasons.join("; "),
          });
          continue;
        }

        throw new BadRequestException(
          `Duplicate import record detected for ${diagnostic.slug}: ${diagnostic.duplicateReasons.join(", ")}`,
        );
      }

      const categoryIds = await this.resolveCategoryIds(record.categorySlugs ?? []);
      const tagIds = await this.resolveTagIds(record.tagSlugs ?? []);

      if (!categoryIds.length) {
        skipped.push({
          name: diagnostic.name,
          slug: diagnostic.slug,
          reason: "No valid category mapping found.",
        });
        continue;
      }

      const tool = await this.create(
        {
          name: record.name,
          slug: diagnostic.slug,
          website: record.website,
          summary: record.summary,
          description: record.description,
          logoUrl: record.logoUrl,
          pricingModel: record.pricingModel,
          metaTitle: record.metaTitle,
          metaDescription: record.metaDescription,
          metadata: {
            features: record.features,
            useCases: record.useCases,
            alternatives: record.alternatives,
            alternativeSlugs: record.alternatives.map((item) => slugify(item)).filter(Boolean),
            languages: record.languages,
            platforms: record.platforms,
          },
          status: record.status ?? dto.defaultStatus ?? ToolStatus.DRAFT,
          categoryIds,
          tagIds,
        },
        actorId,
      );

      imported.push({ id: tool.id, name: tool.name, slug: tool.slug });
    }

    return {
      importedCount: imported.length,
      skippedCount: skipped.length,
      imported,
      skipped,
    };
  }

  async bulkUpdate(dto: BulkUpdateToolsDto, actorId: string) {
    const tools = await this.prisma.client.tool.findMany({
      where: { id: { in: dto.toolIds }, ...activeOnly },
      select: { id: true },
    });

    let updated = 0;
    for (const tool of tools) {
      await this.update(
        tool.id,
        {
          status: dto.status,
          pricingModel: dto.pricingModel,
          categoryIds: dto.categoryIds,
          tagIds: dto.tagIds,
          metadata: dto.metadata as UpdateToolDto["metadata"],
        },
        actorId,
      );
      updated += 1;
    }

    return { updated };
  }

  async bulkPublish(toolIds: string[], actorId: string) {
    const result = await this.bulkUpdate(
      {
        toolIds,
        status: ToolStatus.PUBLISHED,
      },
      actorId,
    );

    return { published: result.updated };
  }

  async bulkRefreshLogos(toolIds: string[], force = true) {
    const jobIds: string[] = [];
    for (const toolId of toolIds) {
      jobIds.push(await enqueueToolLogoCollect(toolId, force));
    }
    return { queued: jobIds.length, jobIds };
  }

  async bulkRefreshScreenshots(toolIds: string[], variants?: Array<"DESKTOP" | "MOBILE" | "DARK">) {
    const jobIds: string[] = [];
    for (const toolId of toolIds) {
      jobIds.push(await enqueueScreenshotCapture(toolId, variants));
    }
    return { queued: jobIds.length, jobIds };
  }

  private async syncCategories(toolId: string, categoryIds: string[]) {
    await this.prisma.client.toolCategory.updateMany({
      where: { toolId, ...activeOnly },
      data: { deletedAt: new Date() },
    });

    for (const [index, categoryId] of categoryIds.entries()) {
      await this.prisma.client.toolCategory.upsert({
        where: { toolId_categoryId: { toolId, categoryId } },
        update: { deletedAt: null, isPrimary: index === 0 },
        create: { toolId, categoryId, isPrimary: index === 0 },
      });
    }
  }

  private async syncTags(toolId: string, tagIds: string[]) {
    await this.prisma.client.toolTag.updateMany({
      where: { toolId, ...activeOnly },
      data: { deletedAt: new Date() },
    });

    for (const tagId of tagIds) {
      await this.prisma.client.toolTag.upsert({
        where: { toolId_tagId: { toolId, tagId } },
        update: { deletedAt: null },
        create: { toolId, tagId },
      });
    }
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.client.tool.findFirst({
      where: { slug, ...activeOnly },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Tool slug '${slug}' already exists`);
    }
  }

  private validateEditorPayload(dto: Pick<CreateToolDto, "status" | "summary" | "metaTitle" | "metaDescription">) {
    if (
      dto.status !== undefined &&
      dto.status !== ToolStatus.DRAFT &&
      dto.status !== ToolStatus.PUBLISHED
    ) {
      throw new BadRequestException("Status must be DRAFT or PUBLISHED.");
    }

    if (dto.summary && dto.summary.trim().length > 120) {
      throw new BadRequestException("Short description must be 120 characters or fewer.");
    }

    if (dto.metaTitle && dto.metaTitle.trim().length > 60) {
      throw new BadRequestException("SEO title should be 60 characters or fewer.");
    }

    if (dto.metaDescription && dto.metaDescription.trim().length > 160) {
      throw new BadRequestException("SEO description should be 160 characters or fewer.");
    }
  }

  private async syncFaqs(toolId: string, faqs: ToolFaqDto[], actorId: string) {
    await this.prisma.client.faq.updateMany({
      where: { toolId, ...activeOnly },
      data: { deletedAt: new Date(), deletedById: actorId },
    });

    for (const [index, faq] of faqs.entries()) {
      const question = faq.question.trim();
      const answer = faq.answer.trim();
      if (!question || !answer) continue;

      await this.prisma.client.faq.create({
        data: {
          toolId,
          slug: slugify(question).slice(0, 120),
          question,
          answer,
          sortOrder: index,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    }
  }

  private parseImportContent(format: "csv" | "json", content: string) {
    if (format === "json") {
      const parsed = JSON.parse(content) as Array<Record<string, unknown>>;
      return parsed.map((item) => this.normalizeImportRecord(item));
    }

    const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(",").map((item) => item.trim());
    return lines.map((line) => {
      const values = line.split(",").map((item) => item.trim());
      const record = headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = values[index] ?? "";
        return acc;
      }, {});
      return this.normalizeImportRecord(record);
    });
  }

  private normalizeImportRecord(record: Record<string, unknown>) {
    return {
      name: String(record.name ?? "").trim(),
      slug: String(record.slug ?? "").trim() || undefined,
      website: String(record.website ?? record.websiteUrl ?? "").trim(),
      summary:
        String(record.summary ?? record.shortDescription ?? "").trim() || undefined,
      description: String(record.description ?? "").trim() || undefined,
      logoUrl: String(record.logoUrl ?? record.logo ?? "").trim() || undefined,
      pricingModel: this.normalizePricingModel(record.pricingModel ?? record.pricing),
      rawStatus: String(record.status ?? "").trim() || undefined,
      status: this.normalizeImportStatus(record.status),
      categorySlugs: this.normalizeStringArray(
        record.categorySlugs ?? record.categorySlug ?? record.categories ?? record.category,
      ),
      tagSlugs: this.normalizeStringArray(record.tagSlugs ?? record.tags),
      features: this.normalizeStringArray(record.features),
      useCases: this.normalizeStringArray(record.useCases),
      alternatives: this.normalizeStringArray(record.alternatives),
      metaTitle: String(record.seoTitle ?? record.metaTitle ?? "").trim() || undefined,
      metaDescription:
        String(record.seoDescription ?? record.metaDescription ?? "").trim() || undefined,
      languages: this.normalizeStringArray(record.languages ?? record.language),
      platforms: this.normalizeStringArray(record.platforms ?? record.platform),
    };
  }

  private normalizePricingModel(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    const aliases: Record<string, PricingModel> = {
      FREE: PricingModel.FREE,
      FREEMIUM: PricingModel.FREEMIUM,
      PAID: PricingModel.PAID,
      CONTACT: PricingModel.CONTACT,
      CONTACT_US: PricingModel.CONTACT,
      CONTACT_SALES: PricingModel.CONTACT,
    };
    return aliases[normalized];
  }

  private normalizeImportStatus(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (normalized === "DRAFT") return ToolStatus.DRAFT;
    if (normalized === "PUBLISHED" || normalized === "PUBLISH") return ToolStatus.PUBLISHED;
    return undefined;
  }

  private normalizeStringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private async resolveCategoryIds(categorySlugs: string[]) {
    if (!categorySlugs.length) return [];
    const categories = await this.prisma.client.category.findMany({
      where: { slug: { in: categorySlugs }, ...activeOnly },
      select: { id: true },
    });
    return categories.map((item) => item.id);
  }

  private async resolveTagIds(tagSlugs: string[]) {
    if (!tagSlugs.length) return [];
    const tags = await this.prisma.client.tag.findMany({
      where: { slug: { in: tagSlugs }, ...activeOnly },
      select: { id: true },
    });
    return tags.map((item) => item.id);
  }

  private async buildImportDiagnostics(records: ImportRecord[]): Promise<ImportRecordDiagnostic[]> {
    const existingTools = await this.prisma.client.tool.findMany({
      where: activeOnly,
      select: { id: true, slug: true, website: true, name: true },
    });
    const categories = await this.prisma.client.category.findMany({
      where: activeOnly,
      select: { slug: true },
    });

    const existingBySlug = new Map(existingTools.map((tool) => [tool.slug.toLowerCase(), tool]));
    const existingByName = new Map(existingTools.map((tool) => [tool.name.trim().toLowerCase(), tool]));
    const existingByDomain = new Map<string, { id: string; slug: string; website: string; name: string }>();
    for (const tool of existingTools) {
      const domain = this.extractDomain(tool.website);
      if (domain && !existingByDomain.has(domain)) {
        existingByDomain.set(domain, tool);
      }
    }

    const categorySet = new Set(categories.map((category) => category.slug.toLowerCase()));
    const seenSlugs = new Map<string, number>();
    const seenDomains = new Map<string, number>();
    const seenNames = new Map<string, number>();

    return records.map((record, index) => {
      const slug = slugify(record.slug || record.name);
      const nameKey = record.name.trim().toLowerCase();
      const websiteDomain = this.extractDomain(record.website);
      const duplicateReasons: string[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      const existingBySlugMatch = slug ? existingBySlug.get(slug.toLowerCase()) : undefined;
      const existingByNameMatch = nameKey ? existingByName.get(nameKey) : undefined;
      const existingByDomainMatch = websiteDomain ? existingByDomain.get(websiteDomain) : undefined;
      const existing =
        existingBySlugMatch ?? existingByNameMatch ?? existingByDomainMatch ?? null;

      if (!record.name) errors.push("Missing required field: name");
      if (!slug) errors.push("Missing required field: slug");
      if (!record.website) {
        errors.push("Missing required field: websiteUrl");
      } else if (!this.isValidHttpsOrHttpUrl(record.website)) {
        errors.push("websiteUrl must be a valid URL");
      }
      if (!record.categorySlugs.length) {
        errors.push("Missing required field: categorySlug");
      }

      const invalidCategories = record.categorySlugs.filter(
        (categorySlug) => !categorySet.has(categorySlug.toLowerCase()),
      );
      if (invalidCategories.length > 0) {
        errors.push(`Unknown categorySlug: ${invalidCategories.join(", ")}`);
      }

      if (!record.summary) {
        errors.push("shortDescription is required");
      } else if (record.summary.length > 120) {
        errors.push("shortDescription must be 120 characters or fewer");
      }

      if (!record.description) errors.push("description is required");
      if (!record.pricingModel) errors.push("pricing is missing or invalid");
      if (record.tagSlugs.length < 2) errors.push("tags must include at least 2 items");
      if (record.features.length < 3) errors.push("features must include at least 3 items");
      if (record.alternatives.length < 2) errors.push("alternatives must include at least 2 items");

      if (record.rawStatus && record.status === undefined) {
        errors.push("status must be Draft or Published");
      }

      if (!record.metaTitle || !record.metaDescription) {
        warnings.push("Missing SEO fields");
      }
      if (record.metaTitle && record.metaTitle.length > 65) {
        warnings.push("seoTitle should be 65 characters or fewer");
      }
      if (
        record.metaDescription &&
        (record.metaDescription.length < 140 || record.metaDescription.length > 170)
      ) {
        warnings.push("seoDescription should be between 140 and 170 characters");
      }
      if (!record.logoUrl) warnings.push("Missing logoUrl");
      if (record.useCases.length === 0) warnings.push("Missing useCases");

      if (existingBySlugMatch) duplicateReasons.push("Existing slug");
      if (existingByNameMatch && existingByNameMatch.id !== existingBySlugMatch?.id) {
        duplicateReasons.push("Existing name");
      }
      if (
        existingByDomainMatch &&
        existingByDomainMatch.id !== existingBySlugMatch?.id &&
        existingByDomainMatch.id !== existingByNameMatch?.id
      ) {
        duplicateReasons.push("Existing website domain");
      }

      if (slug) {
        if (seenSlugs.has(slug)) duplicateReasons.push(`Duplicate slug in file (row ${seenSlugs.get(slug)! + 1})`);
        else seenSlugs.set(slug, index);
      }
      if (nameKey) {
        if (seenNames.has(nameKey)) duplicateReasons.push(`Duplicate name in file (row ${seenNames.get(nameKey)! + 1})`);
        else seenNames.set(nameKey, index);
      }
      if (websiteDomain) {
        if (seenDomains.has(websiteDomain)) {
          duplicateReasons.push(`Duplicate website domain in file (row ${seenDomains.get(websiteDomain)! + 1})`);
        } else {
          seenDomains.set(websiteDomain, index);
        }
      }

      const missingCategory = !record.categorySlugs.length || invalidCategories.length > 0;
      const missingSeo = !record.metaTitle || !record.metaDescription;

      return {
        index,
        name: record.name,
        slug,
        website: record.website,
        websiteDomain,
        categorySlugs: record.categorySlugs,
        existing,
        duplicateReasons,
        errors,
        warnings,
        missingCategory,
        missingSeo,
        valid: errors.length === 0,
        duplicate: duplicateReasons.length > 0,
      };
    });
  }

  private isValidHttpsOrHttpUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private extractDomain(value: string) {
    try {
      return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  private computeCompletenessScore(tool: Prisma.ToolGetPayload<{ include: typeof toolInclude }>) {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const features = Array.isArray(metadata.features) ? metadata.features : [];
    const screenshots = Array.isArray(metadata.screenshots) ? metadata.screenshots : [];

    const checks = [
      Boolean(tool.name),
      Boolean(tool.slug),
      Boolean(tool.website),
      Boolean(tool.summary),
      Boolean(tool.description),
      Boolean(tool.logoUrl),
      Boolean(tool.metaTitle),
      Boolean(tool.metaDescription),
      tool.categories.length > 0,
      tool.tags.length > 0,
      tool.pricingPlans.length > 0 || Boolean(tool.pricingModel),
      features.length > 0,
      screenshots.length > 0,
    ];

    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }
}
