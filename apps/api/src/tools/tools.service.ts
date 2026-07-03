import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { slugify } from "@ai-tool-cms/common";
import { startAiPipeline } from "@ai-tool-cms/ai";
import { emitWebhookEvent } from "@ai-tool-cms/api-platform";
import { enqueueToolLogoCollect } from "@ai-tool-cms/automation";
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
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(slug);

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
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        createdById: actorId,
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
    if (dto.slug) await this.ensureSlugAvailable(slugify(dto.slug), id);

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
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        updatedById: actorId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (dto.categoryIds) await this.syncCategories(id, dto.categoryIds);
    if (dto.tagIds) await this.syncTags(id, dto.tagIds);
    if (dto.faqs) await this.syncFaqs(id, dto.faqs, actorId);

    if (dto.status === ToolStatus.PUBLISHED && existing.status !== ToolStatus.PUBLISHED) {
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
    const diagnostics = await Promise.all(
      records.map(async (record, index) => {
        const slug = slugify(record.slug || record.name);
        const existing = await this.prisma.client.tool.findFirst({
          where: {
            OR: [{ slug }, { website: record.website }],
            ...activeOnly,
          },
          select: { id: true, slug: true, website: true, name: true },
        });

        return {
          index,
          name: record.name,
          slug,
          website: record.website,
          existing,
          warnings: [
            !record.summary ? "Missing summary" : null,
            !record.description ? "Missing description" : null,
            !record.logoUrl ? "Missing logo" : null,
            !record.categorySlugs?.length ? "Missing categories" : null,
          ].filter(Boolean),
        };
      }),
    );

    return {
      format: dto.format,
      total: records.length,
      records: diagnostics,
      readyToImport: diagnostics.filter((item) => !item.existing).length,
      duplicates: diagnostics.filter((item) => item.existing).length,
    };
  }

  async executeImport(dto: ImportExecuteDto, actorId: string) {
    const records = this.parseImportContent(dto.format, dto.content);
    const imported: Array<{ id: string; name: string; slug: string }> = [];
    const skipped: Array<{ name: string; slug: string; reason: string }> = [];

    for (const record of records) {
      const slug = slugify(record.slug || record.name);
      const existing = await this.prisma.client.tool.findFirst({
        where: {
          OR: [{ slug }, { website: record.website }],
          ...activeOnly,
        },
        select: { id: true },
      });

      if (existing) {
        skipped.push({ name: record.name, slug, reason: "Duplicate slug or website" });
        continue;
      }

      const categoryIds = await this.resolveCategoryIds(record.categorySlugs ?? []);
      const tagIds = await this.resolveTagIds(record.tagSlugs ?? []);

      const tool = await this.create(
        {
          name: record.name,
          slug,
          website: record.website,
          summary: record.summary,
          description: record.description,
          logoUrl: record.logoUrl,
          pricingModel: record.pricingModel,
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
      website: String(record.website ?? "").trim(),
      summary: String(record.summary ?? "").trim() || undefined,
      description: String(record.description ?? "").trim() || undefined,
      logoUrl: String(record.logoUrl ?? record.logo ?? "").trim() || undefined,
      pricingModel:
        typeof record.pricingModel === "string" && record.pricingModel
          ? (record.pricingModel as CreateToolDto["pricingModel"])
          : undefined,
      status:
        typeof record.status === "string" && record.status
          ? (record.status as CreateToolDto["status"])
          : undefined,
      categorySlugs: this.normalizeStringArray(record.categorySlugs ?? record.categories),
      tagSlugs: this.normalizeStringArray(record.tagSlugs ?? record.tags),
    };
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
