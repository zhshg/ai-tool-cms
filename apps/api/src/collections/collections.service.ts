import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { slugify } from "@ai-tool-cms/common";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CollectionItemDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from "./dto/collection.dto";

const collectionInclude = {
  user: { select: { id: true, email: true, displayName: true } },
  items: {
    where: activeOnly,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          summary: true,
          website: true,
          logoUrl: true,
          pricingModel: true,
          status: true,
          metadata: true,
          categories: {
            where: activeOnly,
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
            select: { category: { select: { slug: true, name: true, iconUrl: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.CollectionInclude;

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.collection.findMany({
        where: activeOnly,
        include: collectionInclude,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        skip,
        take,
      }),
      this.prisma.client.collection.count({ where: activeOnly }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async publicList(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const where = { ...activeOnly, isPublic: true };
    const [items, total] = await Promise.all([
      this.prisma.client.collection.findMany({
        where,
        include: collectionInclude,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        skip,
        take,
      }),
      this.prisma.client.collection.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const collection = await this.prisma.client.collection.findFirst({
      where: { id, ...activeOnly },
      include: collectionInclude,
    });
    if (!collection) throw new NotFoundException("Collection not found");
    return collection;
  }

  async publicBySlug(slug: string) {
    const collection = await this.prisma.client.collection.findFirst({
      where: { slug, isPublic: true, ...activeOnly },
      include: collectionInclude,
    });
    if (!collection) throw new NotFoundException("Collection not found");
    return collection;
  }

  async create(dto: CreateCollectionDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(slug);

    const collection = await this.prisma.client.collection.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        userId: actorId,
        createdById: actorId,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (dto.items) await this.syncItems(collection.id, dto.items);
    return this.findById(collection.id);
  }

  async update(id: string, dto: UpdateCollectionDto, actorId: string) {
    await this.findById(id);
    if (dto.slug) await this.ensureSlugAvailable(slugify(dto.slug), id);

    await this.prisma.client.collection.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        description: dto.description,
        isPublic: dto.isPublic,
        updatedById: actorId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (dto.items) await this.syncItems(id, dto.items);
    return this.findById(id);
  }

  async remove(id: string, actorId: string) {
    await this.findById(id);
    return this.prisma.client.collection.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
    });
  }

  private async syncItems(collectionId: string, items: CollectionItemDto[]) {
    const uniqueItems = items.filter(
      (item, index, source) =>
        source.findIndex((candidate) => candidate.toolId === item.toolId) === index,
    );
    const toolIds = uniqueItems.map((item) => item.toolId);

    if (toolIds.length) {
      const existingTools = await this.prisma.client.tool.findMany({
        where: { id: { in: toolIds }, status: ToolStatus.PUBLISHED, ...activeOnly },
        select: { id: true },
      });
      const existingToolIds = new Set(existingTools.map((tool) => tool.id));
      const missing = toolIds.filter((toolId) => !existingToolIds.has(toolId));
      if (missing.length)
        throw new NotFoundException(`Published tools not found: ${missing.join(", ")}`);
    }

    await this.prisma.client.collectionItem.updateMany({
      where: { collectionId, ...activeOnly },
      data: { deletedAt: new Date() },
    });

    for (const [index, item] of uniqueItems.entries()) {
      await this.prisma.client.collectionItem.upsert({
        where: { collectionId_toolId: { collectionId, toolId: item.toolId } },
        create: {
          collectionId,
          toolId: item.toolId,
          sortOrder: item.sortOrder ?? index,
          note: item.note,
        },
        update: {
          sortOrder: item.sortOrder ?? index,
          note: item.note,
          deletedAt: null,
        },
      });
    }
  }

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.client.collection.findFirst({
      where: { slug, ...activeOnly, ...(currentId ? { id: { not: currentId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictException(`Collection slug '${slug}' already exists`);
  }
}
