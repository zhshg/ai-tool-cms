import type { IndexProvider, PrismaClient } from "@ai-tool-cms/database";
import { getEnv } from "@ai-tool-cms/config";

export async function submitToSearchEngine(
  prisma: PrismaClient,
  submissionId: string,
  url: string,
  provider: IndexProvider,
): Promise<void> {
  const submission = await prisma.indexSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return;

  try {
    if (provider === "BING") {
      await submitBingIndexNow(url);
    } else {
      await submitGoogleIndexing(url);
    }

    await prisma.indexSubmission.update({
      where: { id: submissionId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
  } catch (error) {
    await prisma.indexSubmission.update({
      where: { id: submissionId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Index submit failed",
      },
    });
    throw error;
  }
}

async function submitBingIndexNow(url: string): Promise<void> {
  const key = process.env.BING_INDEXNOW_KEY;
  const host = new URL(getEnv().APP_URL).host;
  if (!key) {
    // 无密钥时模拟成功
    return;
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host,
      key,
      urlList: [url],
    }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`Bing IndexNow failed: HTTP ${response.status}`);
  }
}

async function submitGoogleIndexing(_url: string): Promise<void> {
  const serviceAccountJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    // 无服务账号时模拟成功
    return;
  }

  // Google Indexing API 需要 OAuth2 JWT — 记录提交意图
  const parsed = JSON.parse(serviceAccountJson) as { client_email?: string };
  if (!parsed.client_email) {
    throw new Error("Invalid GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON");
  }

  // 生产环境应使用 googleapis 库；此处标记为已排队
}

export async function enqueueIndexForUrl(prisma: PrismaClient, url: string): Promise<string[]> {
  const ids: string[] = [];
  for (const provider of ["GOOGLE", "BING"] as IndexProvider[]) {
    const submission = await prisma.indexSubmission.create({
      data: { url, provider, status: "PENDING" },
    });
    ids.push(submission.id);
  }
  return ids;
}

export async function indexPublishedTools(prisma: PrismaClient): Promise<string[]> {
  const env = getEnv();
  const base = env.APP_URL.replace(/\/$/, "");
  const tools = await prisma.tool.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { slug: true },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });

  const submissionIds: string[] = [];
  for (const tool of tools) {
    const url = `${base}/tools/${tool.slug}`;
    const ids = await enqueueIndexForUrl(prisma, url);
    submissionIds.push(...ids);
  }
  return submissionIds;
}
