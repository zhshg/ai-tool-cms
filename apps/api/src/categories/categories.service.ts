import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import type { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.category.findMany({
        where: activeOnly,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip,
        take,
      }),
      this.prisma.client.category.count({ where: activeOnly }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async tree() {
    const categories = await this.prisma.client.category.findMany({
      where: activeOnly,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    type CategoryNode = (typeof categories)[number] & {
      children: CategoryNode[];
    };

    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const category of categories) {
      nodeMap.set(category.id, { ...category, children: [] });
    }

    for (const category of categories) {
      const node = nodeMap.get(category.id)!;
      if (category.parentId && nodeMap.has(category.parentId)) {
        nodeMap.get(category.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findById(id: string) {
    const category = await this.prisma.client.category.findFirst({
      where: { id, ...activeOnly },
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.client.category.findFirst({
      where: { slug, ...activeOnly },
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async create(dto: CreateCategoryDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(slug);

    return this.prisma.client.category.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        createdById: actorId,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, actorId: string) {
    await this.findById(id);

    if (dto.slug) {
      await this.ensureSlugAvailable(slugify(dto.slug), id);
    }

    return this.prisma.client.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        description: dto.description,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        updatedById: actorId,
      },
    });
  }

  async remove(id: string, actorId: string) {
    await this.findById(id);
    return this.prisma.client.category.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
    });
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.client.category.findFirst({
      where: { slug, ...activeOnly },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Category slug '${slug}' already exists`);
    }
  }
}
