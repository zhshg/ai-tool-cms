import { Injectable, NotFoundException } from "@nestjs/common";
import { ContentRevisionStatus } from "@ai-tool-cms/database";
import { applyStagePayload } from "@ai-tool-cms/ai";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";
import { startAiPipeline } from "@ai-tool-cms/ai";
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
          tool: { select: { id: true, name: true, slug: true } },
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
        tool: { select: { id: true, name: true, slug: true } },
        aiTask: true,
      },
    });
    if (!revision) throw new NotFoundException("Content revision not found");
    return revision;
  }

  async approve(id: string, actorId: string, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) {
      return revision;
    }

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

    return this.findRevision(id);
  }

  async reject(id: string, actorId: string, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) {
      return revision;
    }

    return this.prisma.client.contentRevision.update({
      where: { id },
      data: {
        status: ContentRevisionStatus.REJECTED,
        reviewedById: actorId,
        reviewedAt: new Date(),
        reviewNote,
        updatedById: actorId,
      },
      include: {
        tool: { select: { id: true, name: true, slug: true } },
      },
    });
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
}
