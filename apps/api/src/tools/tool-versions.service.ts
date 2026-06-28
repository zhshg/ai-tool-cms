import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import type { CreateToolVersionDto, UpdateToolVersionDto } from "./dto/tool-version.dto";

@Injectable()
export class ToolVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(toolId: string) {
    await this.ensureTool(toolId);
    return this.prisma.client.toolVersion.findMany({
      where: { toolId, ...activeOnly },
      orderBy: { versionNumber: "desc" },
    });
  }

  async findOne(toolId: string, versionId: string) {
    const version = await this.prisma.client.toolVersion.findFirst({
      where: { id: versionId, toolId, ...activeOnly },
    });
    if (!version) throw new NotFoundException("Tool version not found");
    return version;
  }

  async create(toolId: string, dto: CreateToolVersionDto, actorId: string) {
    const tool = await this.ensureTool(toolId);
    const latest = await this.prisma.client.toolVersion.findFirst({
      where: { toolId, ...activeOnly },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const slug = dto.slug ? slugify(dto.slug) : `v${versionNumber}`;

    await this.ensureVersionSlugAvailable(toolId, slug);

    const snapshot = this.buildSnapshot(tool, dto);

    return this.prisma.client.toolVersion.create({
      data: {
        toolId,
        slug,
        versionNumber,
        status: dto.status ?? tool.status,
        changelog: dto.changelog,
        snapshot: snapshot as Prisma.InputJsonValue,
        createdById: actorId,
        publishedAt: (dto.status ?? tool.status) === ToolStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  async update(toolId: string, versionId: string, dto: UpdateToolVersionDto, actorId: string) {
    const existing = await this.findOne(toolId, versionId);
    if (dto.slug) await this.ensureVersionSlugAvailable(toolId, slugify(dto.slug), versionId);

    const tool = await this.ensureTool(toolId);
    const snapshot = this.buildSnapshot(tool, dto, existing.snapshot);

    return this.prisma.client.toolVersion.update({
      where: { id: versionId },
      data: {
        slug: dto.slug ? slugify(dto.slug) : undefined,
        versionNumber: dto.versionNumber,
        status: dto.status,
        changelog: dto.changelog,
        snapshot: snapshot as Prisma.InputJsonValue,
        updatedById: actorId,
        publishedAt: dto.status === ToolStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  async remove(toolId: string, versionId: string, actorId: string) {
    await this.findOne(toolId, versionId);
    return this.prisma.client.toolVersion.update({
      where: { id: versionId },
      data: { deletedAt: new Date(), deletedById: actorId },
    });
  }

  private async ensureTool(toolId: string) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { id: toolId, ...activeOnly },
    });
    if (!tool) throw new NotFoundException("Tool not found");
    return tool;
  }

  private async ensureVersionSlugAvailable(toolId: string, slug: string, excludeId?: string) {
    const existing = await this.prisma.client.toolVersion.findFirst({
      where: { toolId, slug, ...activeOnly },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Version slug '${slug}' already exists for this tool`);
    }
  }

  private buildSnapshot(
    tool: { name: string; metadata: Prisma.JsonValue },
    dto: CreateToolVersionDto | UpdateToolVersionDto,
    previousSnapshot?: Prisma.JsonValue,
  ): Record<string, unknown> {
    const base =
      typeof previousSnapshot === "object" && previousSnapshot !== null
        ? (previousSnapshot as Record<string, unknown>)
        : {};

    const toolMetadata =
      typeof tool.metadata === "object" && tool.metadata !== null
        ? (tool.metadata as Record<string, unknown>)
        : {};

    return {
      ...base,
      name: tool.name,
      features: dto.features ?? toolMetadata.features ?? [],
      platforms: dto.platforms ?? toolMetadata.platforms ?? [],
      pricing: dto.pricing ??
        base.pricing ?? {
          model: "FREE",
          tiers: [],
          regions: ["US"],
          languages: ["en"],
          platforms: [],
        },
    };
  }
}
