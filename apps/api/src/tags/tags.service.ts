import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Tag } from "@prisma/client";
import { TagResponseDto } from "../common/dto/relation.dto";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateTagDto } from "./dto/create-tag.dto";
import type { PaginatedTagsResponseDto } from "./dto/paginated-tags-response.dto";
import type { QueryTagsDto } from "./dto/query-tags.dto";
import type { UpdateTagDto } from "./dto/update-tag.dto";

const SORTABLE_FIELDS = new Set(["name", "slug", "createdAt", "updatedAt"]);

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTagsDto): Promise<PaginatedTagsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { tools: true } } },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { tools: true } } },
    });

    if (!tag) {
      throw new NotFoundException("标签不存在");
    }

    return this.toResponseDto(tag);
  }

  async create(dto: CreateTagDto): Promise<TagResponseDto> {
    try {
      const tag = await this.prisma.tag.create({
        data: dto,
        include: { _count: { select: { tools: true } } },
      });

      return this.toResponseDto(tag);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateTagDto): Promise<TagResponseDto> {
    await this.ensureExists(id);

    try {
      const tag = await this.prisma.tag.update({
        where: { id },
        data: dto,
        include: { _count: { select: { tools: true } } },
      });

      return this.toResponseDto(tag);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { tools: true } } },
    });

    if (!existing) {
      throw new NotFoundException("标签不存在");
    }

    await this.prisma.tag.delete({ where: { id } });
    return this.toResponseDto(existing);
  }

  async ensureTagIdsExist(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }

    const count = await this.prisma.tag.count({
      where: { id: { in: tagIds } },
    });

    if (count !== tagIds.length) {
      throw new NotFoundException("存在无效的标签 ID");
    }
  }

  private buildWhere(query: QueryTagsDto): Prisma.TagWhereInput {
    if (!query.search?.trim()) {
      return {};
    }

    const search = query.search.trim();
    return {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  private buildOrderBy(query: QueryTagsDto): Prisma.TagOrderByWithRelationInput {
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? "") ? query.sortBy! : "createdAt";
    return { [sortBy]: query.sortOrder ?? "desc" };
  }

  private async ensureExists(id: string): Promise<void> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tag) {
      throw new NotFoundException("标签不存在");
    }
  }

  private toResponseDto(tag: Tag & { _count: { tools: number } }): TagResponseDto {
    return {
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      toolCount: tag._count.tools,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("slug 已存在");
    }

    throw error;
  }
}
