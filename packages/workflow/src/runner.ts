import type { PrismaClient } from "@ai-tool-cms/database";
import { advanceWorkflowRun, startWorkflowRun } from "./engine";

const DEFAULT_SLUG = "tool-publish-default";

export async function startToolPublishWorkflow(
  prisma: PrismaClient,
  toolId: string,
  trigger: string,
): Promise<string | null> {
  try {
    return await startWorkflowRun(prisma, DEFAULT_SLUG, { toolId, trigger });
  } catch {
    return null;
  }
}

export async function completeToolPublishWorkflow(
  prisma: PrismaClient,
  toolId: string,
  result: Record<string, unknown>,
): Promise<{ completed: boolean; runId?: string }> {
  const run = await prisma.workflowRun.findFirst({
    where: {
      status: "RUNNING",
      context: { path: ["toolId"], equals: toolId },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return { completed: false };

  let currentRunId = run.id;
  let completed = false;
  let stepResult = result;
  while (!completed) {
    const step = await advanceWorkflowRun(prisma, currentRunId, stepResult);
    completed = step.completed;
    if (!step.completed && step.nextStep) {
      stepResult = { ...stepResult, lastStep: step.nextStep.id };
    }
  }

  return { completed: true, runId: run.id };
}
