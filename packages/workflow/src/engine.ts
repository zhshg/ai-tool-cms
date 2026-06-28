import type { Prisma } from "@ai-tool-cms/database";
import type { PrismaClient } from "@ai-tool-cms/database";

export type WorkflowStepType =
  "CRAWL" | "NORMALIZE" | "AI_SUMMARY" | "AI_SEO" | "AI_PUBLISH" | "INDEX" | "WEBHOOK";

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  config?: Record<string, unknown>;
};

export const DEFAULT_TOOL_PUBLISH_WORKFLOW: WorkflowStep[] = [
  { id: "crawl", type: "CRAWL" },
  { id: "normalize", type: "NORMALIZE" },
  { id: "ai", type: "AI_SUMMARY" },
  { id: "seo", type: "AI_SEO" },
  { id: "publish", type: "AI_PUBLISH" },
  { id: "index", type: "INDEX" },
];

export async function ensureDefaultWorkflows(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.workflowDefinition.findFirst({
    where: { slug: "tool-publish-default", deletedAt: null },
  });
  if (existing) return;

  await prisma.workflowDefinition.create({
    data: {
      slug: "tool-publish-default",
      name: "Tool Publish Pipeline",
      description: "Crawler → Normalize → AI → SEO → Publish → Index",
      steps: DEFAULT_TOOL_PUBLISH_WORKFLOW as Prisma.InputJsonValue,
      isEnabled: true,
    },
  });
}

export async function startWorkflowRun(
  prisma: PrismaClient,
  definitionSlug: string,
  context: Record<string, unknown>,
): Promise<string> {
  const definition = await prisma.workflowDefinition.findFirst({
    where: { slug: definitionSlug, isEnabled: true, deletedAt: null },
  });
  if (!definition) {
    throw new Error(`Workflow not found: ${definitionSlug}`);
  }

  const run = await prisma.workflowRun.create({
    data: {
      definitionId: definition.id,
      status: "RUNNING",
      context: context as Prisma.InputJsonValue,
      startedAt: new Date(),
      metadata: { steps: definition.steps },
    },
  });

  return run.id;
}

export async function advanceWorkflowRun(
  prisma: PrismaClient,
  runId: string,
  stepResult: Record<string, unknown>,
): Promise<{ completed: boolean; nextStep?: WorkflowStep }> {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { definition: true },
  });
  if (!run) throw new Error(`Workflow run not found: ${runId}`);

  const steps = run.definition.steps as WorkflowStep[];
  const nextIndex = run.currentStep + 1;

  if (nextIndex >= steps.length) {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        result: stepResult as Prisma.InputJsonValue,
        currentStep: nextIndex,
      },
    });
    return { completed: true };
  }

  await prisma.workflowRun.update({
    where: { id: runId },
    data: { currentStep: nextIndex, result: stepResult as Prisma.InputJsonValue },
  });

  return { completed: false, nextStep: steps[nextIndex] };
}
