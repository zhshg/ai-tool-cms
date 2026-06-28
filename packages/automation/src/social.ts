import type { PrismaClient, SocialPlatform } from "@ai-tool-cms/database";
import { getEnv } from "@ai-tool-cms/config";

export type SocialPostTemplate = "NEW_AI" | "TRENDING_AI" | "WEEKLY_AI" | "TOP_AI";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  X: "X",
  LINKEDIN: "LinkedIn",
  BLUESKY: "Bluesky",
  THREADS: "Threads",
  MASTODON: "Mastodon",
};

export function buildSocialPostContent(
  template: SocialPostTemplate,
  tools: Array<{ name: string; slug: string; summary?: string | null }>,
): string {
  const env = getEnv();
  const base = env.APP_URL.replace(/\/$/, "");
  const lines = tools.map(
    (t) => `• ${t.name}${t.summary ? ` — ${t.summary}` : ""} ${base}/tools/${t.slug}`,
  );
  const header: Record<SocialPostTemplate, string> = {
    NEW_AI: "🆕 New AI tools discovered today:",
    TRENDING_AI: "🔥 Trending AI tools:",
    WEEKLY_AI: "📅 Weekly AI roundup:",
    TOP_AI: "⭐ Top AI tools this week:",
  };
  return `${header[template]}\n\n${lines.join("\n")}\n\n#AI #AITools`;
}

export async function generateSocialPosts(
  prisma: PrismaClient,
  template: SocialPostTemplate,
): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tools = await prisma.tool.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      ...(template === "NEW_AI" ? { publishedAt: { gte: since } } : {}),
    },
    orderBy: template === "TRENDING_AI" ? { updatedAt: "desc" } : { publishedAt: "desc" },
    take: 5,
    select: { id: true, name: true, slug: true, summary: true },
  });

  const content = buildSocialPostContent(template, tools);
  const platforms: SocialPlatform[] = ["X", "LINKEDIN", "BLUESKY", "THREADS", "MASTODON"];
  const postIds: string[] = [];

  for (const platform of platforms) {
    const post = await prisma.socialPost.create({
      data: {
        platform,
        status: "SCHEDULED",
        content,
        toolId: tools[0]?.id,
        scheduledAt: new Date(),
        metadata: { template, platformLabel: PLATFORM_LABELS[platform] },
      },
    });
    postIds.push(post.id);
  }

  return postIds;
}

async function publishToPlatform(platform: SocialPlatform, _content: string): Promise<string> {
  const envKey = `SOCIAL_${platform}_ENABLED`;
  const enabled = process.env[envKey] === "true" || process.env[envKey] === "1";
  if (!enabled) {
    return `mock-${platform.toLowerCase()}-${Date.now()}`;
  }

  // 真实 API 集成占位：按平台读取 bearer token
  const token = process.env[`SOCIAL_${platform}_TOKEN`];
  if (!token) {
    throw new Error(`Missing SOCIAL_${platform}_TOKEN`);
  }

  // 各平台 API 不同，此处记录为已发布
  return `${platform.toLowerCase()}-${Date.now()}`;
}

export async function publishSocialPost(prisma: PrismaClient, postId: string): Promise<void> {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) return;

  try {
    const externalId = await publishToPlatform(post.platform, post.content);
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalId,
      },
    });
  } catch (error) {
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Publish failed",
      },
    });
    throw error;
  }
}
