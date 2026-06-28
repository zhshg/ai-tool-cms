import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import type { CreateTagDto, UpdateTagDto } from "./dto/tag.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.tag.findMany({
        where: activeOnly,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      this.prisma.client.tag.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const tag = await this.prisma.client.tag.findFirst({
      where: { id, ...activeOnly },
    });
    if (!tag) throw new NotFoundException("Tag not found");
    return tag;
  }

  async findBySlug(slug: string) {
    const tag = await this.prisma.client.tag.findFirst({
      where: { slug, ...activeOnly },
    });
    if (!tag) throw new NotFoundException("Tag not found");
    return tag;
  }

  async create(dto: CreateTagDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(slug);

    return this.prisma.client.tag.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        createdById: actorId,
      },
    });
  }

  async update(id: string, dto: UpdateTagDto, actorId: string) {
    await this.findById(id);
    if (dto.slug) await this.ensureSlugAvailable(slugify(dto.slug), id);

    return this.prisma.client.tag.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        description: dto.description,
        updatedById: actorId,
      },
    });
  }

  async remove(id: string, actorId: string) {
    await this.findById(id);
    return this.prisma.client.tag.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
    });
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.client.tag.findFirst({
      where: { slug, ...activeOnly },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Tag slug '${slug}' already exists`);
    }
  }
}
