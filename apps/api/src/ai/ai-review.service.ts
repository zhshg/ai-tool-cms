import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, ContentRevisionStatus, ToolStatus } from "@ai-tool-cms/database";
import type { Prisma } from "@ai-tool-cms/database";
import { applyStagePayload, startAiPipeline } from "@ai-tool-cms/ai";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class AiReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async listRevisions(query: PaginationQueryDto & { status?: ContentRevisionStatus }) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const where = {
      ...activeOnly,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.contentRevision.findMany({
        where,
        include: {
          tool: { select: { id: true, name: true, slug: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.client.contentRevision.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findRevision(id: string) {
    const revision = await this.prisma.client.contentRevision.findFirst({
      where: { id, ...activeOnly },
      include: {
        tool: { select: { id: true, name: true, slug: true, status: true } },
        aiTask: true,
      },
    });
    if (!revision) throw new NotFoundException("Content revision not found");
    return revision;
  }

  async compare(id: string) {
    const revision = await this.findRevision(id);
    const tool = await this.prisma.client.tool.findFirst({
      where: { id: revision.toolId, ...activeOnly },
      include: {
        faqs: { where: activeOnly, orderBy: { sortOrder: "asc" } },
        seoMetadata: true,
      },
    });
    if (!tool) throw new NotFoundException("Tool not found");

    return {
      revision,
      current: {
        summary: tool.summary,
        description: tool.description,
        longDescription: tool.longDescription,
        metadata: tool.metadata,
        metaTitle: tool.metaTitle,
        metaDescription: tool.metaDescription,
        faqs: tool.faqs,
        seoMetadata: tool.seoMetadata,
        status: tool.status,
      },
      proposed: revision.payload,
    };
  }

  async updateRevisionPayload(id: string, actorId: string, payload: unknown, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) return revision;

    const updated = await this.prisma.client.contentRevision.update({
      where: { id },
      data: {
        payload: payload as Prisma.InputJsonValue,
        reviewNote,
        updatedById: actorId,
        metadata: {
          ...((revision.metadata ?? {}) as Record<string, unknown>),
          editedAt: new Date().toISOString(),
          editedById: actorId,
        } as Prisma.InputJsonValue,
      },
      include: { tool: { select: { id: true, name: true, slug: true, status: true } } },
    });

    await this.writeAudit(
      actorId,
      AuditAction.UPDATE,
      "ContentRevision",
      id,
      revision.payload,
      payload,
      {
        stage: revision.stage,
        toolId: revision.toolId,
      },
    );
    return updated;
  }

  async approve(id: string, actorId: string, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) return revision;

    await this.prisma.client.$transaction(async (tx) => {
      await applyStagePayload(tx, revision.toolId, revision.stage, revision.payload, actorId);
      await tx.contentRevision.update({
        where: { id },
        data: {
          status: ContentRevisionStatus.APPROVED,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote,
          updatedById: actorId,
        },
      });
    });

    await this.writeAudit(
      actorId,
      AuditAction.UPDATE,
      "ContentRevision",
      id,
      { status: ContentRevisionStatus.PENDING },
      { status: ContentRevisionStatus.APPROVED },
      { stage: revision.stage, toolId: revision.toolId },
    );
    return this.findRevision(id);
  }

  async reject(id: string, actorId: string, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) return revision;

    const updated = await this.prisma.client.contentRevision.update({
      where: { id },
      data: {
        status: ContentRevisionStatus.REJECTED,
        reviewedById: actorId,
        reviewedAt: new Date(),
        reviewNote,
        updatedById: actorId,
      },
      include: {
        tool: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    await this.writeAudit(
      actorId,
      AuditAction.UPDATE,
      "ContentRevision",
      id,
      { status: ContentRevisionStatus.PENDING },
      { status: ContentRevisionStatus.REJECTED },
      { stage: revision.stage, toolId: revision.toolId },
    );
    return updated;
  }

  async bulkApprove(ids: string[], actorId: string, reviewNote?: string) {
    const results = [] as unknown[];
    for (const id of [...new Set(ids)].filter(Boolean)) {
      results.push(await this.approve(id, actorId, reviewNote));
    }
    return { approved: results.length, results };
  }

  async bulkReject(ids: string[], actorId: string, reviewNote?: string) {
    const results = [] as unknown[];
    for (const id of [...new Set(ids)].filter(Boolean)) {
      results.push(await this.reject(id, actorId, reviewNote));
    }
    return { rejected: results.length, results };
  }

  async publishTool(toolId: string, actorId: string) {
    const before = await this.prisma.client.tool.findFirst({
      where: { id: toolId, ...activeOnly },
    });
    if (!before) throw new NotFoundException("Tool not found");

    const after = await this.prisma.client.tool.update({
      where: { id: toolId },
      data: { status: ToolStatus.PUBLISHED, publishedAt: new Date(), updatedById: actorId },
    });

    await this.writeAudit(
      actorId,
      AuditAction.PUBLISH,
      "Tool",
      toolId,
      { status: before.status },
      { status: after.status },
      { slug: after.slug },
    );
    return after;
  }

  async archiveTool(toolId: string, actorId: string) {
    const before = await this.prisma.client.tool.findFirst({
      where: { id: toolId, ...activeOnly },
    });
    if (!before) throw new NotFoundException("Tool not found");

    const after = await this.prisma.client.tool.update({
      where: { id: toolId },
      data: { status: ToolStatus.ARCHIVED, updatedById: actorId },
    });

    await this.writeAudit(
      actorId,
      AuditAction.ARCHIVE,
      "Tool",
      toolId,
      { status: before.status },
      { status: after.status },
      { slug: after.slug },
    );
    return after;
  }

  async history(toolId: string) {
    const [revisions, auditLogs] = await Promise.all([
      this.prisma.client.contentRevision.findMany({
        where: { toolId, ...activeOnly },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.client.auditLog.findMany({
        where: {
          deletedAt: null,
          OR: [{ entityId: toolId }, { metadata: { path: ["toolId"], equals: toolId } }],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return { revisions, auditLogs };
  }

  async bulkRegenerate(toolIds: string[], actorId: string) {
    const uniqueToolIds = [...new Set(toolIds)].filter(Boolean);
    const results = [] as Array<{ toolId: string; pipelineRunId: string; jobId: string }>;
    for (const toolId of uniqueToolIds) {
      const result = await this.regenerate(toolId, actorId);
      results.push(result);
    }
    return { queued: results.length, results };
  }

  async regenerate(toolId: string, actorId: string) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { id: toolId, ...activeOnly },
    });
    if (!tool) throw new NotFoundException("Tool not found");

    const result = await startAiPipeline(
      toolId,
      (queue, job, payload) => enqueueAiJob(queue as AiQueueName, job, payload),
      actorId,
    );
    return { toolId, ...result };
  }

  private async writeAudit(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
