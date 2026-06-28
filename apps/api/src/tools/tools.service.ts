import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Tool, ToolStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateToolDto } from "./dto/create-tool.dto";
import type { PaginatedToolsResponseDto } from "./dto/paginated-tools-response.dto";
import type { QueryToolsDto } from "./dto/query-tools.dto";
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

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const tool = await this.prisma.tool.findUnique({ where: { id } });
    if (!tool) {
      throw new NotFoundException("工具不存在");
    }

    return this.toResponseDto(tool);
  }

  async create(dto: CreateToolDto): Promise<ToolResponseDto> {
    const status = dto.status ?? ToolStatus.DRAFT;
    const publishedAt = this.resolvePublishedAt(status, dto.publishedAt);

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
        },
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

    try {
      const tool = await this.prisma.tool.update({
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
      });

      return this.toResponseDto(tool);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<ToolResponseDto> {
    await this.ensureExists(id);

    const tool = await this.prisma.tool.delete({ where: { id } });
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

  private toResponseDto(tool: Tool): ToolResponseDto {
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
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
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
