import type { PrismaClient } from "@ai-tool-cms/database";
import { startAiPipeline } from "@ai-tool-cms/ai";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";

const DEFAULT_INTERVAL_DAYS = Number(process.env.AUTOMATION_AI_REFRESH_DAYS ?? 30);

export async function runAiRefresh(
  prisma: PrismaClient,
  scheduleId: string,
  toolId: string,
): Promise<{ pipelineRunId: string }> {
  const schedule = await prisma.aiRefreshSchedule.findFirst({
    where: { id: scheduleId, toolId, deletedAt: null, isEnabled: true },
  });
  if (!schedule) {
    throw new Error(`AI refresh schedule not found: ${scheduleId}`);
  }

  const { pipelineRunId } = await startAiPipeline(toolId, (queue, job, payload) =>
    enqueueAiJob(queue as AiQueueName, job, payload),
  );

  const now = new Date();
  const nextDueAt = new Date(now.getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000);

  await prisma.aiRefreshSchedule.update({
    where: { id: scheduleId },
    data: {
      lastRefreshedAt: now,
      nextDueAt,
      metadata: {
        ...(schedule.metadata as object),
        lastPipelineRunId: pipelineRunId,
        contentTypes: schedule.contentTypes,
      },
    },
  });

  return { pipelineRunId };
}

export async function ensureAiRefreshSchedules(prisma: PrismaClient): Promise<number> {
  const tools = await prisma.tool.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { id: true },
    take: 500,
  });
  let created = 0;
  const now = new Date();
  for (const tool of tools) {
    const existing = await prisma.aiRefreshSchedule.findFirst({
      where: { toolId: tool.id, deletedAt: null },
    });
    if (existing) continue;
    await prisma.aiRefreshSchedule.create({
      data: {
        toolId: tool.id,
        intervalDays: DEFAULT_INTERVAL_DAYS,
        nextDueAt: new Date(now.getTime() + DEFAULT_INTERVAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    created += 1;
  }
  return created;
}

export async function pollDueAiRefresh(
  prisma: PrismaClient,
): Promise<Array<{ scheduleId: string; toolId: string }>> {
  const now = new Date();
  const schedules = await prisma.aiRefreshSchedule.findMany({
    where: {
      deletedAt: null,
      isEnabled: true,
      OR: [{ nextDueAt: null }, { nextDueAt: { lte: now } }],
    },
    take: 10,
    select: { id: true, toolId: true },
  });
  return schedules.map((s) => ({ scheduleId: s.id, toolId: s.toolId }));
}
