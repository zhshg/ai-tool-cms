import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  bootstrapAutomation,
  enqueueToolLogoCollect,
  previewToolLogo,
  getAutomationCenterMetrics,
  runDailyAutomationPoll,
  runWeeklyAutomationPoll,
  generateSocialPosts,
  indexPublishedTools,
  enqueueSocialPost,
  enqueueIndexSubmit,
} from "@ai-tool-cms/automation";
import {
  enqueueDiscoveryRun,
  getDiscoveryDashboard,
  pollDueDiscoverySources,
} from "@ai-tool-cms/discovery";
import { enqueueScreenshotCapture } from "@ai-tool-cms/screenshot";

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async center() {
    return getAutomationCenterMetrics(this.db);
  }

  async discoveryDashboard() {
    return getDiscoveryDashboard(this.db);
  }

  async bootstrap() {
    return bootstrapAutomation(this.db);
  }

  async runDaily() {
    return runDailyAutomationPoll(this.db);
  }

  async runWeekly() {
    return runWeeklyAutomationPoll(this.db);
  }

  async triggerDiscovery() {
    const taskIds = await pollDueDiscoverySources(this.db);
    const jobIds: string[] = [];
    for (const taskId of taskIds) {
      jobIds.push(await enqueueDiscoveryRun(taskId));
    }
    return { taskIds, jobIds };
  }

  async triggerScreenshots(toolId: string) {
    const jobId = await enqueueScreenshotCapture(toolId);
    return { jobId };
  }

  async triggerToolLogo(toolId: string, force = true) {
    const jobId = await enqueueToolLogoCollect(toolId, force);
    return { jobId };
  }

  async previewToolLogo(toolId: string) {
    return previewToolLogo(this.db, toolId);
  }

  async triggerSocial(template: "NEW_AI" | "TRENDING_AI" | "WEEKLY_AI" | "TOP_AI") {
    const postIds = await generateSocialPosts(this.db, template);
    const jobIds: string[] = [];
    for (const postId of postIds) {
      jobIds.push(await enqueueSocialPost(postId));
    }
    return { postIds, jobIds };
  }

  async triggerIndex() {
    const submissionIds = await indexPublishedTools(this.db);
    const jobIds: string[] = [];
    for (const submissionId of submissionIds) {
      const submission = await this.db.indexSubmission.findUnique({
        where: { id: submissionId },
      });
      if (submission) {
        jobIds.push(await enqueueIndexSubmit(submission.id, submission.url, submission.provider));
      }
    }
    return { submissionIds, jobIds };
  }

  async listDiscoveryResults(limit = 50) {
    return this.db.discoveryResult.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { task: { include: { source: true } } },
    });
  }

  async dismissDiscoveryResult(id: string) {
    return this.db.discoveryResult.update({
      where: { id },
      data: { status: "DISMISSED" },
    });
  }

  mcpInfo() {
    return {
      name: "ai-tool-cms",
      transport: "stdio",
      command: "npx",
      args: ["-y", "pnpm", "--filter", "@ai-tool-cms/mcp-server", "start"],
      tools: [
        "search_ai_tools",
        "get_tool_details",
        "compare_tools",
        "search_categories",
        "query_pricing",
        "latest_ai_tools",
      ],
      clients: ["Cursor", "Claude Desktop", "ChatGPT", "Windsurf", "Cherry Studio"],
      configExample: "packages/mcp-server/mcp-config.example.json",
      description:
        "AI Native Interface — connect any MCP client to search, compare, and query AI tools from the CMS.",
    };
  }

  async listRuns(params: { page?: number; pageSize?: number; kind?: string; status?: string }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.kind) {
      where.kind = params.kind;
    }
    if (params.status) {
      where.status = params.status;
    }

    const [items, total] = await Promise.all([
      this.db.automationRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          kind: true,
          status: true,
          referenceId: true,
          startedAt: true,
          finishedAt: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.db.automationRun.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getRun(id: string) {
    return this.db.automationRun.findUnique({
      where: { id },
    });
  }
}
