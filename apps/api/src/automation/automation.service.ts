import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  bootstrapAutomation,
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
}
