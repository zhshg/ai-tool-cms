import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Tool, ToolStatus } from "@prisma/client";
import { CategoriesService } from "../categories/categories.service";
import { CategorySummaryDto, TagSummaryDto } from "../common/dto/relation.dto";
import { PrismaService } from "../prisma/prisma.service";
import { TagsService } from "../tags/tags.service";
import type { CreateToolDto } from "./dto/create-tool.dto";
import type { PaginatedToolsResponseDto } from "./dto/paginated-tools-response.dto";
import type { QueryToolsDto } from "./dto/query-tools.dto";
import type { SetToolCategoriesDto } from "./dto/set-tool-relations.dto";
import type { SetToolTagsDto } from "./dto/set-tool-relations.dto";
import type { ToolResponseDto } from "./dto/tool-response.dto";
import type { UpdateToolDto } from "./dto/update-tool.dto";

const SORTABLE_FIELDS = new Set([
  "name",
  "slug",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "status",
  "pricing",
]);

const toolInclude = {
  categories: {
    include: {
      category: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
} as const;

type ToolWithRelations = Prisma.ToolGetPayload<{ include: typeof toolInclude }>;

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly tagsService: TagsService,
  ) {}

  async findAll(query: QueryToolsDto): Promise<PaginatedToolsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.tool.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: toolInclude,
      }),
      this.prisma.tool.count({ where }),
    ]);

    return {
      items: items.map((tool) => this.toResponseDto(tool)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<ToolResponseDto> {
    const tool = await this.prisma.tool.findUnique({
      where: { id },
      include: toolInclude,
    });

    if (!tool) {
      throw new NotFoundException("工具不存在");
    }

    return this.toResponseDto(tool);
  }

  async create(dto: CreateToolDto): Promise<ToolResponseDto> {
    const status = dto.status ?? ToolStatus.DRAFT;
    const publishedAt = this.resolvePublishedAt(status, dto.publishedAt);

    await this.categoriesService.ensureCategoryIdsExist(dto.categoryIds ?? []);
    await this.tagsService.ensureTagIdsExist(dto.tagIds ?? []);

    try {
      const tool = await this.prisma.tool.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          website: dto.website,
          logo: dto.logo,
          pricing: dto.pricing,
          status,
          publishedAt,
          categories: dto.categoryIds?.length
            ? {
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              }
            : undefined,
          tags: dto.tagIds?.length
            ? {
                create: dto.tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
        },
        include: toolInclude,
      });

      return this.toResponseDto(tool);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateToolDto): Promise<ToolResponseDto> {
    const existing = await this.prisma.tool.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("工具不存在");
    }

    const nextStatus = dto.status ?? existing.status;
    const publishedAt = this.resolveUpdatePublishedAt(existing, dto, nextStatus);

    if (dto.categoryIds !== undefined) {
      await this.categoriesService.ensureCategoryIdsExist(dto.categoryIds);
    }

    if (dto.tagIds !== undefined) {
      await this.tagsService.ensureTagIdsExist(dto.tagIds);
    }

    try {
      const tool = await this.prisma.$transaction(async (tx) => {
        if (dto.categoryIds !== undefined) {
          await tx.toolCategory.deleteMany({ where: { toolId: id } });
          if (dto.categoryIds.length > 0) {
            await tx.toolCategory.createMany({
              data: dto.categoryIds.map((categoryId) => ({ toolId: id, categoryId })),
            });
          }
        }

        if (dto.tagIds !== undefined) {
          await tx.toolTag.deleteMany({ where: { toolId: id } });
          if (dto.tagIds.length > 0) {
            await tx.toolTag.createMany({
              data: dto.tagIds.map((tagId) => ({ toolId: id, tagId })),
            });
          }
        }

        return tx.tool.update({
          where: { id },
          data: {
            slug: dto.slug,
            name: dto.name,
            description: dto.description,
            website: dto.website,
            logo: dto.logo,
            pricing: dto.pricing,
            status: dto.status,
            ...(publishedAt !== undefined ? { publishedAt } : {}),
          },
          include: toolInclude,
        });
      });

      return this.toResponseDto(tool);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async setCategories(id: string, dto: SetToolCategoriesDto): Promise<ToolResponseDto> {
    await this.ensureExists(id);
    await this.categoriesService.ensureCategoryIdsExist(dto.categoryIds);

    const tool = await this.prisma.$transaction(async (tx) => {
      await tx.toolCategory.deleteMany({ where: { toolId: id } });

      if (dto.categoryIds.length > 0) {
        await tx.toolCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({ toolId: id, categoryId })),
        });
      }

      return tx.tool.findUniqueOrThrow({
        where: { id },
        include: toolInclude,
      });
    });

    return this.toResponseDto(tool);
  }

  async setTags(id: string, dto: SetToolTagsDto): Promise<ToolResponseDto> {
    await this.ensureExists(id);
    await this.tagsService.ensureTagIdsExist(dto.tagIds);

    const tool = await this.prisma.$transaction(async (tx) => {
      await tx.toolTag.deleteMany({ where: { toolId: id } });

      if (dto.tagIds.length > 0) {
        await tx.toolTag.createMany({
          data: dto.tagIds.map((tagId) => ({ toolId: id, tagId })),
        });
      }

      return tx.tool.findUniqueOrThrow({
        where: { id },
        include: toolInclude,
      });
    });

    return this.toResponseDto(tool);
  }

  async remove(id: string): Promise<ToolResponseDto> {
    const tool = await this.prisma.tool.findUnique({
      where: { id },
      include: toolInclude,
    });

    if (!tool) {
      throw new NotFoundException("工具不存在");
    }

    await this.prisma.tool.delete({ where: { id } });
    return this.toResponseDto(tool);
  }

  private buildWhere(query: QueryToolsDto): Prisma.ToolWhereInput {
    const conditions: Prisma.ToolWhereInput[] = [];

    if (query.status) {
      conditions.push({ status: query.status });
    }

    if (query.pricing) {
      conditions.push({ pricing: query.pricing });
    }

    if (query.categoryId) {
      conditions.push({
        categories: {
          some: { categoryId: query.categoryId },
        },
      });
    }

    if (query.tagId) {
      conditions.push({
        tags: {
          some: { tagId: query.tagId },
        },
      });
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      conditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { website: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildOrderBy(query: QueryToolsDto): Prisma.ToolOrderByWithRelationInput {
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? "") ? query.sortBy! : "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    return { [sortBy]: sortOrder };
  }

  private resolvePublishedAt(status: ToolStatus, publishedAt?: string): Date | null {
    if (publishedAt) {
      return new Date(publishedAt);
    }

    if (status === ToolStatus.PUBLISHED) {
      return new Date();
    }

    return null;
  }

  private resolveUpdatePublishedAt(
    existing: Tool,
    dto: UpdateToolDto,
    nextStatus: ToolStatus,
  ): Date | null | undefined {
    if (dto.publishedAt !== undefined) {
      return dto.publishedAt ? new Date(dto.publishedAt) : null;
    }

    if (dto.status === undefined) {
      return undefined;
    }

    if (nextStatus === ToolStatus.PUBLISHED) {
      return existing.publishedAt ?? new Date();
    }

    return null;
  }

  private async ensureExists(id: string): Promise<void> {
    const tool = await this.prisma.tool.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tool) {
      throw new NotFoundException("工具不存在");
    }
  }

  private toResponseDto(tool: ToolWithRelations): ToolResponseDto {
    return {
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      website: tool.website,
      logo: tool.logo,
      pricing: tool.pricing,
      status: tool.status,
      publishedAt: tool.publishedAt?.toISOString() ?? null,
      categories: tool.categories.map((item) => this.toCategorySummary(item.category)),
      tags: tool.tags.map((item) => this.toTagSummary(item.tag)),
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  private toCategorySummary(category: {
    id: string;
    slug: string;
    name: string;
  }): CategorySummaryDto {
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
    };
  }

  private toTagSummary(tag: { id: string; slug: string; name: string }): TagSummaryDto {
    return {
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "字段";
      throw new ConflictException(`${target} 已存在`);
    }

    throw error;
  }
}
