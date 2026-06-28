import type { Job } from "bullmq";
import { Worker } from "bullmq";
import {
  AI_QUEUE_NAMES,
  createRedisConnection,
  enqueueAiJob,
  type AiPipelineJobPayload,
  type AiQueueName,
} from "@ai-tool-cms/queue";
import {
  AiGenerationTaskStatus,
  AiPipelineStage,
  ContentRevisionStatus,
  prisma,
} from "@ai-tool-cms/database";
import { createLogger } from "@ai-tool-cms/logger";
import {
  enqueueNextStage,
  extractFeatures,
  generateFaq,
  generateGeo,
  generateSeo,
  generateSummary,
  QUALITY_THRESHOLD,
  scoreQuality,
  type EnqueueFn,
  type ToolPromptContext,
} from "@ai-tool-cms/ai";
import type { AiPipelineStageId } from "@ai-tool-cms/ai";

const log = createLogger({ service: "ai-pipeline-worker" });
const MAX_QUALITY_RETRIES = 3;

const workerConnection = () => createRedisConnection() as never;

const enqueueFn: EnqueueFn = async (queueName, jobName, payload) =>
  enqueueAiJob(queueName as AiQueueName, jobName, payload);

export async function loadToolContext(toolId: string): Promise<ToolPromptContext | null> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    include: {
      categories: {
        where: { deletedAt: null },
        include: { category: true },
      },
    },
  });
  if (!tool) return null;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const primaryCategory = tool.categories.find((c) => c.isPrimary)?.category;
  const features = Array.isArray(metadata.aiFeatures)
    ? (metadata.aiFeatures as string[]).join(", ")
    : "";

  return {
    tool_name: tool.name,
    website: tool.website,
    description: tool.description ?? undefined,
    category: primaryCategory?.name ?? undefined,
    features,
    summary: tool.summary ?? undefined,
    slug: tool.slug,
    locale: "en",
  };
}

async function createAiTask(
  toolId: string,
  taskType: string,
  input: Record<string, unknown>,
): Promise<string> {
  const task = await prisma.aiGenerationTask.create({
    data: {
      toolId,
      taskType,
      status: AiGenerationTaskStatus.RUNNING,
      input: input as never,
      startedAt: new Date(),
    },
  });
  return task.id;
}

async function finishAiTask(
  taskId: string,
  output: Record<string, unknown>,
  status: AiGenerationTaskStatus = AiGenerationTaskStatus.SUCCEEDED,
): Promise<void> {
  await prisma.aiGenerationTask.update({
    where: { id: taskId },
    data: {
      status,
      output: output as never,
      finishedAt: new Date(),
    },
  });
}

async function saveRevision(
  toolId: string,
  stage: AiPipelineStage,
  payload: Record<string, unknown>,
  aiTaskId: string,
  qualityScore?: number,
): Promise<void> {
  await prisma.contentRevision.create({
    data: {
      toolId,
      stage,
      status: ContentRevisionStatus.PENDING,
      payload: payload as never,
      qualityScore,
      aiTaskId,
      metadata: { source: "ai-pipeline" },
    },
  });
}

async function updatePipelineMetadata(
  toolId: string,
  pipelineRunId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const tool = await prisma.tool.findUniqueOrThrow({ where: { id: toolId } });
  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const pipeline = (metadata.aiPipeline ?? {}) as Record<string, unknown>;

  await prisma.tool.update({
    where: { id: toolId },
    data: {
      metadata: {
        ...metadata,
        aiPipeline: {
          ...pipeline,
          pipelineRunId,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      } as never,
    },
  });
}

async function processStage(
  stage: AiPipelineStageId,
  payload: AiPipelineJobPayload,
): Promise<void> {
  const ctx = await loadToolContext(payload.toolId);
  if (!ctx) {
    log.warn("tool not found for AI pipeline", { toolId: payload.toolId });
    return;
  }

  const taskId = await createAiTask(payload.toolId, `AI_${stage}`, {
    pipelineRunId: payload.pipelineRunId,
    attempt: payload.attempt ?? 0,
  });

  try {
    switch (stage) {
      case "SUMMARY": {
        const result = await generateSummary(ctx);
        await saveRevision(payload.toolId, AiPipelineStage.SUMMARY, result, taskId);
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "SUMMARY",
          summary: result,
        });
        await finishAiTask(taskId, result as never);
        break;
      }
      case "FEATURE": {
        const result = await extractFeatures(ctx);
        await saveRevision(payload.toolId, AiPipelineStage.FEATURE, result, taskId);
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "FEATURE",
          features: result,
        });
        await finishAiTask(taskId, result as never);
        break;
      }
      case "FAQ": {
        const result = await generateFaq(ctx);
        await saveRevision(payload.toolId, AiPipelineStage.FAQ, { faqs: result }, taskId);
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "FAQ",
          faqCount: result.length,
        });
        await finishAiTask(taskId, { faqs: result } as never);
        break;
      }
      case "SEO": {
        const result = await generateSeo(ctx);
        await saveRevision(payload.toolId, AiPipelineStage.SEO, result, taskId);
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "SEO",
          seo: true,
        });
        await finishAiTask(taskId, result as never);
        break;
      }
      case "GEO": {
        const result = await generateGeo(ctx);
        await saveRevision(payload.toolId, AiPipelineStage.GEO, result, taskId);
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "GEO",
          geo: true,
        });
        await finishAiTask(taskId, result as never);
        break;
      }
      case "QUALITY": {
        const tool = await prisma.tool.findUniqueOrThrow({ where: { id: payload.toolId } });
        const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
        const pipeline = (metadata.aiPipeline ?? {}) as Record<string, unknown>;
        const summary = pipeline.summary as
          { oneParagraph?: string; longDescription?: string } | undefined;
        const features = pipeline.features as { features?: string[] } | undefined;

        const quality = scoreQuality({
          summary: summary?.oneParagraph,
          longDescription: summary?.longDescription,
          features: features?.features,
          faqCount: Number(pipeline.faqCount ?? 0),
          hasSeo: Boolean(pipeline.seo),
          hasGeo: Boolean(pipeline.geo),
        });

        await saveRevision(
          payload.toolId,
          AiPipelineStage.QUALITY,
          quality as never,
          taskId,
          quality.overall,
        );
        await finishAiTask(taskId, quality as never);
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "QUALITY",
          quality,
        });

        if (!quality.passed) {
          const attempt = (payload.attempt ?? 0) + 1;
          if (attempt < MAX_QUALITY_RETRIES) {
            log.info("quality below threshold, restarting pipeline", {
              toolId: payload.toolId,
              score: quality.overall,
              threshold: QUALITY_THRESHOLD,
              attempt,
            });
            await enqueueAiJob(AI_QUEUE_NAMES.AI_SUMMARY, "summary-retry", {
              ...payload,
              attempt,
            });
            return;
          }
          log.warn("quality retries exhausted, continuing to publish gate", {
            toolId: payload.toolId,
            score: quality.overall,
          });
        }
        break;
      }
      case "PUBLISH": {
        await saveRevision(
          payload.toolId,
          AiPipelineStage.PUBLISH,
          {
            message: "Pipeline complete — awaiting human review before publish",
            pipelineRunId: payload.pipelineRunId,
          },
          taskId,
        );
        await updatePipelineMetadata(payload.toolId, payload.pipelineRunId, {
          stage: "PUBLISH",
          status: "awaiting_review",
        });
        await finishAiTask(taskId, { status: "awaiting_review" });
        break;
      }
      default:
        break;
    }

    await enqueueNextStage(stage, payload, enqueueFn);
  } catch (error) {
    await finishAiTask(
      taskId,
      { error: error instanceof Error ? error.message : String(error) },
      AiGenerationTaskStatus.FAILED,
    );
    throw error;
  }
}

function createStageWorker(
  queueName: (typeof AI_QUEUE_NAMES)[keyof typeof AI_QUEUE_NAMES],
  stage: AiPipelineStageId,
): Worker<AiPipelineJobPayload> {
  return new Worker<AiPipelineJobPayload>(
    queueName,
    async (job: Job<AiPipelineJobPayload>) => {
      log.info("ai stage started", { stage, toolId: job.data.toolId });
      await processStage(stage, job.data);
      log.info("ai stage finished", { stage, toolId: job.data.toolId });
    },
    { connection: workerConnection(), concurrency: 2 },
  );
}

export function startAiPipelineWorkers(): Worker<AiPipelineJobPayload>[] {
  return [
    createStageWorker(AI_QUEUE_NAMES.AI_SUMMARY, "SUMMARY"),
    createStageWorker(AI_QUEUE_NAMES.AI_FEATURE, "FEATURE"),
    createStageWorker(AI_QUEUE_NAMES.AI_FAQ, "FAQ"),
    createStageWorker(AI_QUEUE_NAMES.AI_SEO, "SEO"),
    createStageWorker(AI_QUEUE_NAMES.AI_GEO, "GEO"),
    createStageWorker(AI_QUEUE_NAMES.AI_QUALITY, "QUALITY"),
    createStageWorker(AI_QUEUE_NAMES.AI_PUBLISH, "PUBLISH"),
  ];
}
