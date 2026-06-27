import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Category, Prisma } from "@prisma/client";
import { CategoryResponseDto } from "../common/dto/relation.dto";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { PaginatedCategoriesResponseDto } from "./dto/paginated-categories-response.dto";
import type { QueryCategoriesDto } from "./dto/query-categories.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";

const SORTABLE_FIELDS = new Set(["name", "slug", "createdAt", "updatedAt"]);

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCategoriesDto): Promise<PaginatedCategoriesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { tools: true } } },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { tools: true } } },
    });

    if (!category) {
      throw new NotFoundException("分类不存在");
    }

    return this.toResponseDto(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.create({
        data: dto,
        include: { _count: { select: { tools: true } } },
      });

      return this.toResponseDto(category);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    await this.ensureExists(id);

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: dto,
        include: { _count: { select: { tools: true } } },
      });

      return this.toResponseDto(category);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { tools: true } } },
    });

    if (!existing) {
      throw new NotFoundException("分类不存在");
    }

    await this.prisma.category.delete({ where: { id } });
    return this.toResponseDto(existing);
  }

  async ensureCategoryIdsExist(categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) {
      return;
    }

    const count = await this.prisma.category.count({
      where: { id: { in: categoryIds } },
    });

    if (count !== categoryIds.length) {
      throw new NotFoundException("存在无效的分类 ID");
    }
  }

  private buildWhere(query: QueryCategoriesDto): Prisma.CategoryWhereInput {
    if (!query.search?.trim()) {
      return {};
    }

    const search = query.search.trim();
    return {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  private buildOrderBy(query: QueryCategoriesDto): Prisma.CategoryOrderByWithRelationInput {
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? "") ? query.sortBy! : "createdAt";
    return { [sortBy]: query.sortOrder ?? "desc" };
  }

  private async ensureExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException("分类不存在");
    }
  }

  private toResponseDto(
    category: Category & { _count: { tools: number } },
  ): CategoryResponseDto {
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      toolCount: category._count.tools,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("slug 已存在");
    }

    throw error;
  }
}
