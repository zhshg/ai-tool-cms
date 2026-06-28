import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import type { CreateToolDto, UpdateToolDto } from "./dto/tool.dto";

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

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { id, ...activeOnly },
      include: toolInclude,
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

    return this.findById(tool.id);
  }

  async update(id: string, dto: UpdateToolDto, actorId: string) {
    await this.findById(id);
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

    return this.findById(id);
  }

  async remove(id: string, actorId: string) {
    await this.findById(id);
    return this.prisma.client.tool.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
    });
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
}
