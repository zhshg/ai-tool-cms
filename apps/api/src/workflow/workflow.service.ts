import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ensureDefaultWorkflows, startWorkflowRun, type WorkflowStep } from "@ai-tool-cms/workflow";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async listDefinitions() {
    await ensureDefaultWorkflows(this.db);
    return this.db.workflowDefinition.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async getDefinition(slug: string) {
    const definition = await this.db.workflowDefinition.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!definition) throw new NotFoundException("Workflow not found");
    return definition;
  }

  async updateDefinition(
    slug: string,
    body: { steps?: WorkflowStep[]; isEnabled?: boolean; description?: string },
  ) {
    const definition = await this.getDefinition(slug);
    return this.db.workflowDefinition.update({
      where: { id: definition.id },
      data: {
        steps: body.steps as Prisma.InputJsonValue | undefined,
        isEnabled: body.isEnabled,
        description: body.description,
      },
    });
  }

  async listRuns(definitionSlug?: string, limit = 50) {
    return this.db.workflowRun.findMany({
      where: definitionSlug ? { definition: { slug: definitionSlug, deletedAt: null } } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { definition: { select: { slug: true, name: true } } },
    });
  }

  async startRun(slug: string, context: Record<string, unknown>) {
    const runId = await startWorkflowRun(this.db, slug, context);
    return { runId, status: "RUNNING" };
  }
}
