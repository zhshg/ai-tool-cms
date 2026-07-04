import { Injectable, NotFoundException } from "@nestjs/common";
import { hashPassword } from "@ai-tool-cms/auth";
import {
  AiGenerationTaskStatus,
  AutomationRunStatus,
  ContentRevisionStatus,
  ToolStatus,
  UserStatus,
  type Prisma,
} from "@ai-tool-cms/database";
import { isMeiliConfigured } from "@ai-tool-cms/search";
import { activeOnly, toJsonObject } from "../common/prisma.util";
import { PrismaService } from "../prisma/prisma.service";
import type { ResetUserPasswordDto, UpdateUserDto } from "./dto/update-user.dto";
import type { UpsertSettingDto } from "./dto/upsert-setting.dto";

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      toolsTotal,
      publishedTools,
      draftTools,
      categories,
      tags,
      users,
      activeUsers,
      pendingAiReview,
      contentStats,
      seoDashboard,
      crawlerDashboard,
      searchDashboard,
      health,
      recentActivity,
    ] = await Promise.all([
      this.prisma.client.tool.count({ where: activeOnly }),
      this.prisma.client.tool.count({ where: { ...activeOnly, status: ToolStatus.PUBLISHED } }),
      this.prisma.client.tool.count({ where: { ...activeOnly, status: ToolStatus.DRAFT } }),
      this.prisma.client.category.count({ where: activeOnly }),
      this.prisma.client.tag.count({ where: activeOnly }),
      this.prisma.client.user.count({ where: activeOnly }),
      this.prisma.client.user.count({ where: { ...activeOnly, status: UserStatus.ACTIVE } }),
      this.prisma.client.contentRevision.count({
        where: { ...activeOnly, status: ContentRevisionStatus.PENDING },
      }),
      this.buildContentStats(),
      this.buildSeoStats(),
      this.buildCrawlerStats(),
      this.buildSearchStats(),
      this.buildHealthStats(),
      this.buildRecentActivity(),
    ]);

    return {
      totalTools: toolsTotal,
      publishedTools,
      draftTools,
      categories,
      tags,
      users,
      activeUsers,
      pendingAiReview,
      indexedTools: seoDashboard.indexedTools,
      crawlerJobs: crawlerDashboard.crawlerJobs,
      workerQueue: crawlerDashboard.workerQueue,
      schedulerJobs: crawlerDashboard.schedulerJobs,
      searchIndex: searchDashboard.searchIndex,
      lastCrawl: crawlerDashboard.lastCrawl,
      contentScore: contentStats.contentScore,
      seoScore: seoDashboard.seoScore || contentStats.seoScore,
      brokenLinks: seoDashboard.brokenLinks,
      missingLogos: contentStats.missingLogos,
      importQueue: crawlerDashboard.importQueue,
      aiQueue: crawlerDashboard.aiQueue,
      storage: health.storage,
      database: health.database,
      systemHealth: health,
      content: contentStats,
      seo: seoDashboard,
      crawler: crawlerDashboard,
      worker: {
        status: crawlerDashboard.workerQueue > 0 ? "busy" : "idle",
        queueDepth: crawlerDashboard.workerQueue,
        failedJobs: crawlerDashboard.failedJobs,
      },
      import: {
        queued: crawlerDashboard.importQueue,
        recentRuns: crawlerDashboard.recentImportRuns,
      },
      ai: {
        queued: crawlerDashboard.aiQueue,
        pendingReview: pendingAiReview,
        failedTasks: crawlerDashboard.failedAiTasks,
      },
      search: searchDashboard,
      infrastructure: {
        storage: health.storage,
        searchIndex: searchDashboard.status,
        database: health.database ? "healthy" : "degraded",
        redis: health.redis ? "healthy" : "degraded",
      },
      recentActivity,
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
    const [indexedTools, lastSnapshot, brokenLinks, missingSeo] = await Promise.all([
      this.prisma.client.tool.count({ where: { ...activeOnly, status: ToolStatus.PUBLISHED } }),
      this.prisma.client.seoHealthSnapshot.findFirst({
        orderBy: { createdAt: "desc" },
        select: { score: true, createdAt: true },
      }),
      this.prisma.client.brokenLinkCheck.count({ where: { isHealthy: false } }),
      this.prisma.client.tool.count({
        where: {
          ...activeOnly,
          OR: [
            { metaTitle: null },
            { metaDescription: null },
            { metaTitle: "" },
            { metaDescription: "" },
          ],
        },
      }),
    ]);

    return {
      indexedTools,
      seoScore: lastSnapshot?.score ?? 0,
      brokenLinks,
      missingMetadata: missingSeo,
      lastSnapshotAt: lastSnapshot?.createdAt.toISOString() ?? null,
    };
  }

  private async buildCrawlerStats() {
    const [
      automationRuns,
      pendingRuns,
      runningRuns,
      failedRuns,
      lastCrawl,
      importQueue,
      recentImportRuns,
      aiQueue,
      failedAiTasks,
      schedulerJobs,
    ] = await Promise.all([
      this.prisma.client.automationRun.count({ where: { kind: "DISCOVERY" } }),
      this.prisma.client.automationRun.count({ where: { status: AutomationRunStatus.PENDING } }),
      this.prisma.client.automationRun.count({ where: { status: AutomationRunStatus.RUNNING } }),
      this.prisma.client.automationRun.count({ where: { status: AutomationRunStatus.FAILED } }),
      this.prisma.client.automationRun.findFirst({
        where: { kind: "DISCOVERY", status: AutomationRunStatus.COMPLETED },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.client.automationRun.count({
        where: {
          kind: "DISCOVERY",
          status: { in: [AutomationRunStatus.PENDING, AutomationRunStatus.RUNNING] },
        },
      }),
      this.prisma.client.automationRun.count({
        where: { kind: "DISCOVERY", createdAt: { gte: daysAgo(7) } },
      }),
      this.prisma.client.aiGenerationTask.count({
        where: {
          ...activeOnly,
          status: { in: [AiGenerationTaskStatus.PENDING, AiGenerationTaskStatus.RUNNING] },
        },
      }),
      this.prisma.client.aiGenerationTask.count({
        where: { ...activeOnly, status: AiGenerationTaskStatus.FAILED },
      }),
      this.prisma.client.aiRefreshSchedule.count({ where: { ...activeOnly, isEnabled: true } }),
    ]);

    return {
      crawlerJobs: automationRuns,
      workerQueue: pendingRuns + runningRuns + aiQueue,
      schedulerJobs,
      failedJobs: failedRuns,
      importQueue,
      recentImportRuns,
      aiQueue,
      failedAiTasks,
      crawlerStatus: runningRuns > 0 ? "running" : failedRuns > 0 ? "degraded" : "idle",
      lastCrawl: lastCrawl?.createdAt?.toISOString() ?? null,
    };
  }

  private async buildSearchStats() {
    const [publishedTools, queries, clicks] = await Promise.all([
      this.prisma.client.tool.count({ where: { ...activeOnly, status: ToolStatus.PUBLISHED } }),
      this.prisma.client.searchQueryLog.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      this.prisma.client.searchClickLog.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    ]);
    const configured = isMeiliConfigured();

    return {
      searchIndex: configured ? publishedTools : 0,
      status: configured ? "configured" : "not_configured",
      indexedTools: configured ? publishedTools : 0,
      weeklyQueries: queries,
      weeklyClicks: clicks,
    };
  }

  private async buildHealthStats() {
    const [dbOk, redisOk, settingCount] = await Promise.allSettled([
      this.prisma.client.$queryRaw`SELECT 1`,
      Promise.resolve(true),
      this.prisma.client.setting.count({ where: activeOnly }),
    ]);

    return {
      status:
        dbOk.status === "fulfilled" && redisOk.status === "fulfilled" ? "healthy" : "degraded",
      database: dbOk.status === "fulfilled",
      redis: redisOk.status === "fulfilled",
      meilisearch: true,
      storage: settingCount.status === "fulfilled" ? "configured" : "unknown",
    };
  }

  private async buildContentStats() {
    const tools = await this.prisma.client.tool.findMany({
      where: activeOnly,
      select: {
        summary: true,
        description: true,
        longDescription: true,
        logoUrl: true,
        metaTitle: true,
        metaDescription: true,
        metadata: true,
        categories: { where: activeOnly, select: { isPrimary: true } },
        tags: { where: activeOnly, select: { id: true } },
        faqs: { where: activeOnly, select: { id: true } },
        toolScreenshots: { select: { id: true } },
      },
    });

    const profiles = tools.map((tool) => {
      const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
      const missingLogo =
        !tool.logoUrl?.trim() &&
        !stringValue(metadata.logoUrl) &&
        !stringValue(metadata.logo) &&
        !stringValue(metadata.collectedLogoUrl);
      const missingDescription =
        !tool.summary?.trim() || !(tool.longDescription?.trim() || tool.description?.trim());
      const missingFeatures = normalizeStringList(metadata.features).length === 0;
      const missingFaq = tool.faqs.length === 0;
      const missingScreenshots =
        tool.toolScreenshots.length === 0 && normalizeStringList(metadata.screenshots).length === 0;
      const missingSeo = !tool.metaTitle?.trim() || !tool.metaDescription?.trim();
      const missingCategory = !tool.categories.some((item) => item.isPrimary);
      const missingTags = tool.tags.length === 0;
      const checks = [
        !missingLogo,
        !missingDescription,
        !missingFeatures,
        !missingFaq,
        !missingScreenshots,
        !missingSeo,
        !missingCategory,
        !missingTags,
      ];

      return {
        score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
        seoReady: !missingSeo,
        missingLogo,
        missingDescription,
        missingFeatures,
        missingFaq,
        missingScreenshots,
      };
    });

    const count = (key: keyof (typeof profiles)[number]) =>
      profiles.filter((profile) => Boolean(profile[key])).length;
    const contentScore = profiles.length
      ? Math.round(profiles.reduce((sum, profile) => sum + profile.score, 0) / profiles.length)
      : 0;
    const seoReady = profiles.filter((profile) => profile.seoReady).length;

    return {
      contentScore,
      seoScore: profiles.length ? Math.round((seoReady / profiles.length) * 100) : 0,
      totalTools: tools.length,
      missingLogos: count("missingLogo"),
      missingDescriptions: count("missingDescription"),
      missingFeatures: count("missingFeatures"),
      missingFaq: count("missingFaq"),
      missingScreenshots: count("missingScreenshots"),
      launchReadyTools: profiles.filter((profile) => profile.score >= 80).length,
      needsWork: profiles.filter((profile) => profile.score < 70).length,
    };
  }

  private async buildRecentActivity() {
    const [tools, revisions, automationRuns, auditLogs] = await Promise.all([
      this.prisma.client.tool.findMany({
        where: activeOnly,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
      this.prisma.client.contentRevision.findMany({
        where: activeOnly,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          stage: true,
          updatedAt: true,
          tool: { select: { name: true } },
        },
      }),
      this.prisma.client.automationRun.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, kind: true, status: true, updatedAt: true },
      }),
      this.prisma.client.auditLog.findMany({
        where: activeOnly,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, action: true, entityType: true, entitySlug: true, createdAt: true },
      }),
    ]);

    return [
      ...tools.map((tool) => ({
        id: tool.id,
        type: "tool",
        label: `${tool.name} updated`,
        status: tool.status,
        href: `/tools/${tool.id}/edit`,
        createdAt: tool.updatedAt.toISOString(),
      })),
      ...revisions.map((revision) => ({
        id: revision.id,
        type: "ai_review",
        label: `${revision.tool?.name ?? "AI revision"} ${revision.stage.toLowerCase()}`,
        status: revision.status,
        href: "/ai-review",
        createdAt: revision.updatedAt.toISOString(),
      })),
      ...automationRuns.map((run) => ({
        id: run.id,
        type: "automation",
        label: `${run.kind.toLowerCase().replace(/_/g, " ")} run`,
        status: run.status,
        href: "/automation",
        createdAt: run.updatedAt.toISOString(),
      })),
      ...auditLogs.map((log) => ({
        id: log.id,
        type: "audit",
        label: `${log.entityType} ${log.action.toLowerCase()}`,
        status: log.entitySlug ?? "audit",
        href: "/settings",
        createdAt: log.createdAt.toISOString(),
      })),
    ]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 12);
  }
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}