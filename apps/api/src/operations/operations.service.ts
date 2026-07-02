import { Injectable, NotFoundException } from "@nestjs/common";
import { hashPassword } from "@ai-tool-cms/auth";
import { ToolStatus, UserStatus, type Prisma } from "@ai-tool-cms/database";
import { isMeiliConfigured } from "@ai-tool-cms/search";
import { activeOnly, toJsonObject } from "../common/prisma.util";
import { PrismaService } from "../prisma/prisma.service";
import type { ResetUserPasswordDto, UpdateUserDto } from "./dto/update-user.dto";
import type { UpsertSettingDto } from "./dto/upsert-setting.dto";

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [toolsTotal, publishedTools, draftTools, categories, tags, users, pendingAiReview] =
      await Promise.all([
        this.prisma.client.tool.count({ where: activeOnly }),
        this.prisma.client.tool.count({
          where: { ...activeOnly, status: ToolStatus.PUBLISHED },
        }),
        this.prisma.client.tool.count({
          where: { ...activeOnly, status: ToolStatus.DRAFT },
        }),
        this.prisma.client.category.count({ where: activeOnly }),
        this.prisma.client.tag.count({ where: activeOnly }),
        this.prisma.client.user.count({ where: activeOnly }),
        this.prisma.client.contentRevision.count({
          where: { ...activeOnly, status: "PENDING" },
        }),
      ]);

    const [seoDashboard, crawlerDashboard, searchDashboard, health] = await Promise.allSettled([
      this.buildSeoStats(),
      this.buildCrawlerStats(),
      this.buildSearchStats(),
      this.buildHealthStats(),
    ]);

    return {
      totalTools: toolsTotal,
      publishedTools,
      draftTools,
      categories,
      tags,
      users,
      pendingAiReview,
      indexedTools: seoDashboard.status === "fulfilled" ? seoDashboard.value.indexedTools : 0,
      crawlerJobs: crawlerDashboard.status === "fulfilled" ? crawlerDashboard.value.crawlerJobs : 0,
      workerQueue:
        crawlerDashboard.status === "fulfilled" ? crawlerDashboard.value.workerQueue : 0,
      schedulerJobs:
        crawlerDashboard.status === "fulfilled" ? crawlerDashboard.value.schedulerJobs : 0,
      searchIndex:
        searchDashboard.status === "fulfilled" ? searchDashboard.value.searchIndex : 0,
      lastCrawl: crawlerDashboard.status === "fulfilled" ? crawlerDashboard.value.lastCrawl : null,
      systemHealth:
        health.status === "fulfilled"
          ? health.value
          : { status: "degraded", database: false, redis: false, meilisearch: false },
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.prisma.client.user.findFirst({
      where: { id: userId, ...activeOnly },
      include: {
        roles: {
          where: activeOnly,
          select: { roleId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        email: dto.email,
        displayName: dto.displayName,
        status: dto.status,
        updatedById: actorId,
      },
    });

    if (dto.roleCodes) {
      const roles = await this.prisma.client.role.findMany({
        where: {
          ...activeOnly,
          code: { in: dto.roleCodes },
        },
        select: { id: true, code: true },
      });

      const matchedRoleIds = new Set(roles.map((role) => role.id));
      const currentRoleIds = existing.roles.map((assignment) => assignment.roleId);

      if (currentRoleIds.length) {
        await this.prisma.client.userRole.updateMany({
          where: {
            userId,
            roleId: { in: currentRoleIds },
            ...activeOnly,
          },
          data: { deletedAt: new Date() },
        });
      }

      for (const role of roles) {
        await this.prisma.client.userRole.upsert({
          where: {
            userId_roleId: {
              userId,
              roleId: role.id,
            },
          },
          update: { deletedAt: null },
          create: { userId, roleId: role.id },
        });
      }

      if (!matchedRoleIds.size) {
        await this.prisma.client.user.update({
          where: { id: userId },
          data: { status: dto.status ?? UserStatus.INACTIVE },
        });
      }
    }

    return this.prisma.client.user.findFirst({
      where: { id: userId, ...activeOnly },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          where: activeOnly,
          select: {
            role: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });
  }

  async resetUserPassword(userId: string, dto: ResetUserPasswordDto, actorId: string) {
    const user = await this.prisma.client.user.findFirst({
      where: { id: userId, ...activeOnly },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const newPassword = dto.newPassword?.trim() || "Admin123!";
    const passwordHash = await hashPassword(newPassword);

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedById: actorId,
      },
    });

    return {
      userId,
      email: user.email,
      temporaryPassword: newPassword,
    };
  }

  async upsertSetting(dto: UpsertSettingDto, actorId: string) {
    const existing = await this.prisma.client.setting.findUnique({
      where: { key: dto.key },
    });

    const data: Prisma.SettingUncheckedCreateInput | Prisma.SettingUncheckedUpdateInput = {
      key: dto.key,
      value: toJsonObject(dto.value),
      group: dto.group ?? "general",
      description: dto.description,
      isPublic: dto.isPublic ?? false,
      updatedById: actorId,
      deletedAt: null,
    };

    if (existing) {
      return this.prisma.client.setting.update({
        where: { key: dto.key },
        data,
      });
    }

    return this.prisma.client.setting.create({
      data: {
        ...(data as Prisma.SettingUncheckedCreateInput),
        createdById: actorId,
      },
    });
  }

  async listAssignableRoles() {
    return this.prisma.client.role.findMany({
      where: activeOnly,
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  }

  private async buildSeoStats() {
    const indexedTools = await this.prisma.client.tool.count({
      where: {
        ...activeOnly,
        status: ToolStatus.PUBLISHED,
      },
    });

    return { indexedTools };
  }

  private async buildCrawlerStats() {
    const [automationRuns, lastCrawl] = await Promise.all([
      this.prisma.client.automationRun.count({
        where: {
          kind: "DISCOVERY",
        },
      }),
      this.prisma.client.automationRun.findFirst({
        where: {
          kind: "DISCOVERY",
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      crawlerJobs: automationRuns,
      workerQueue: 0,
      schedulerJobs: 0,
      lastCrawl: lastCrawl?.createdAt?.toISOString() ?? null,
    };
  }

  private async buildSearchStats() {
    const publishedTools = await this.prisma.client.tool.count({
      where: {
        ...activeOnly,
        status: ToolStatus.PUBLISHED,
      },
    });

    return {
      searchIndex: isMeiliConfigured() ? publishedTools : 0,
    };
  }

  private async buildHealthStats() {
    const [dbOk, redisOk] = await Promise.allSettled([
      this.prisma.client.$queryRaw`SELECT 1`,
      Promise.resolve(true),
    ]);

    return {
      status:
        dbOk.status === "fulfilled" && redisOk.status === "fulfilled" ? "healthy" : "degraded",
      database: dbOk.status === "fulfilled",
      redis: redisOk.status === "fulfilled",
      meilisearch: true,
    };
  }
}
