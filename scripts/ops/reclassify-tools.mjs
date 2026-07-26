import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const FALLBACK_SLUGS = ["ai-assistant", "ai-search", "ai-automation"];
const PROBLEMATIC_PRIMARY_SLUGS = new Set([...FALLBACK_SLUGS, "general-ai-tools", "uncategorized"]);

const RULES = [
  [
    "ai-writing",
    [
      "writing",
      "writer",
      "copywriting",
      "copywriter",
      "blog",
      "article",
      "essay",
      "grammar",
      "paraphrase",
      "rewrite",
      "summariz",
      "content creation",
      "caption",
    ],
  ],
  [
    "ai-image",
    [
      "image",
      "photo",
      "picture",
      "avatar",
      "headshot",
      "art generator",
      "stable diffusion",
      "midjourney",
      "background remover",
      "upscale",
      "design image",
    ],
  ],
  [
    "ai-video",
    [
      "video",
      "shorts",
      "reel",
      "youtube",
      "subtitle",
      "caption video",
      "screen recording",
      "animation",
      "video editing",
      "text to video",
    ],
  ],
  [
    "ai-audio",
    [
      "audio",
      "voice",
      "speech",
      "podcast",
      "transcription",
      "transcribe",
      "text to speech",
      "music",
      "sound",
      "song",
      "voiceover",
    ],
  ],
  [
    "ai-coding",
    [
      "code",
      "coding",
      "developer tool",
      "programming",
      "github",
      "pull request",
      "debug",
      "devops",
      "terminal",
      "ide",
      "code assistant",
    ],
  ],
  [
    "ai-design",
    [
      "ai design",
      "ui design",
      "ux design",
      "figma",
      "wireframe",
      "prototype",
      "mockup",
      "brand design",
      "logo generator",
      "creative design",
    ],
  ],
  [
    "design-generators",
    ["design generator", "poster", "banner", "flyer", "template", "canva", "graphic design"],
  ],
  [
    "marketing",
    [
      "marketing",
      "campaign",
      "ads",
      "advertising",
      "growth",
      "lead generation",
      "landing page",
      "email marketing",
      "newsletter",
      "conversion",
    ],
  ],
  [
    "seo",
    [
      "seo",
      "keyword",
      "serp",
      "backlink",
      "rank tracking",
      "search engine optimization",
      "content optimization",
    ],
  ],
  [
    "social-media",
    [
      "social media",
      "twitter",
      "x.com",
      "linkedin",
      "instagram",
      "tiktok",
      "facebook",
      "threads",
      "post scheduler",
      "social post",
    ],
  ],
  [
    "sales-assistant",
    ["sales", "crm", "prospect", "outreach", "cold email", "pipeline", "deal", "lead scoring"],
  ],
  [
    "customer-support",
    [
      "customer support",
      "support",
      "helpdesk",
      "ticket",
      "customer service",
      "live chat",
      "intercom",
      "zendesk",
    ],
  ],
  [
    "ai-business",
    [
      "business intelligence",
      "business operations",
      "business process",
      "enterprise",
      "management platform",
      "business analytics",
      "operations platform",
    ],
  ],
  [
    "ai-productivity",
    [
      "productivity",
      "task",
      "todo",
      "calendar",
      "note",
      "notion",
      "workspace",
      "organize",
      "meeting notes",
      "personal productivity",
    ],
  ],
  ["ai-agents", ["agent", "autonomous", "multi-agent", "ai employee", "copilot agent", "agentic"]],
  [
    "ai-research",
    [
      "research",
      "paper",
      "academic",
      "literature",
      "citation",
      "scholar",
      "study",
      "knowledge base",
    ],
  ],
  [
    "education",
    [
      "education",
      "learning",
      "teacher",
      "student",
      "course",
      "tutor",
      "homework",
      "quiz",
      "lesson",
    ],
  ],
  ["ai-education", ["ai education", "learning platform", "edtech", "classroom"]],
  ["students", ["student", "homework", "essay grader", "study", "flashcard", "exam"]],
  [
    "finance",
    [
      "finance",
      "financial",
      "stock",
      "invest",
      "trading",
      "crypto",
      "accounting",
      "invoice",
      "tax",
      "budget",
    ],
  ],
  ["legal", ["legal", "law", "lawyer", "contract", "compliance", "clause", "court", "policy"]],
  [
    "health",
    [
      "health",
      "medical",
      "doctor",
      "fitness",
      "workout",
      "nutrition",
      "wellness",
      "mental health",
      "therapy",
    ],
  ],
  [
    "e-commerce",
    [
      "ecommerce",
      "e-commerce",
      "shopify",
      "amazon",
      "product listing",
      "store",
      "retail",
      "dropshipping",
    ],
  ],
  [
    "website-builders",
    ["website builder", "site builder", "web builder", "no-code website", "landing page builder"],
  ],
  [
    "ai-data",
    ["data", "spreadsheet", "csv", "excel", "analytics", "dashboard", "bi", "visualization", "etl"],
  ],
  [
    "ai-search",
    [
      "search",
      "discover",
      "find",
      "knowledge search",
      "semantic search",
      "web search",
      "answer engine",
      "research assistant",
    ],
  ],
  [
    "ai-automation",
    [
      "automation",
      "automate",
      "zapier",
      "make.com",
      "workflow automation",
      "rpa",
      "integrations",
      "trigger",
      "bot workflow",
    ],
  ],
  [
    "ai-assistant",
    [
      "assistant",
      "chatbot",
      "chat bot",
      "personal assistant",
      "virtual assistant",
      "copilot",
      "chatgpt",
      "conversation",
    ],
  ],
  ["chatbots", ["chatbot", "chat bot", "bot builder", "conversational ai", "customer chatbot"]],
  ["ai-maps", ["map", "maps", "location", "navigation", "places", "travel route"]],
  ["ai-travel", ["travel", "trip", "itinerary", "hotel", "flight", "tourism", "vacation"]],
  ["translators", ["translate", "translation", "translator", "localization", "multilingual"]],
  ["human-resources", ["hr", "recruit", "resume", "candidate", "interview", "hiring", "employee"]],
  ["real-estate", ["real estate", "property", "realtor", "listing", "mortgage", "home buyer"]],
  ["gaming", ["game", "gaming", "npc", "unity", "unreal", "game asset"]],
  ["fun-tools", ["fun", "meme", "joke", "entertainment", "game", "playful"]],
  ["ai-presentation", ["presentation", "slides", "slide deck", "powerpoint", "pitch deck"]],
  [
    "ai-detection",
    ["detect ai", "ai detector", "plagiarism", "deepfake detection", "content detector"],
  ],
  ["startup-assistant", ["startup", "founder", "mvp", "pitch", "business plan", "idea validation"]],
];

function parseArgs(argv) {
  const options = { dryRun: false, limit: 0, minScore: 2 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--limit") options.limit = Number(argv[index + 1] ?? 0);
    if (arg === "--min-score") options.minScore = Number(argv[index + 1] ?? 2);
  }
  if (!Number.isFinite(options.limit) || options.limit < 0) options.limit = 0;
  if (!Number.isFinite(options.minScore) || options.minScore < 1) options.minScore = 2;
  return options;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9+#.\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toolText(tool) {
  const metadata = tool.metadata && typeof tool.metadata === "object" ? tool.metadata : {};
  const metadataParts = [
    metadata.aiUseCases,
    metadata.useCases,
    metadata.aiFeatures,
    metadata.features,
    metadata.aiPlatforms,
    metadata.aiLanguages,
  ]
    .flatMap((item) => (Array.isArray(item) ? item : []))
    .join(" ");

  return normalize(
    [
      tool.name,
      tool.slug,
      tool.summary,
      tool.description,
      tool.longDescription,
      tool.metaTitle,
      tool.metaDescription,
      metadataParts,
      ...tool.tags.map((item) => item.tag.name),
    ].join(" "),
  );
}

function scoreRule(text, keywords) {
  let score = 0;
  for (const keyword of keywords) {
    const key = normalize(keyword);
    if (!key) continue;
    if (text.includes(key)) score += key.includes(" ") ? 3 : 2;
  }
  return score;
}

function fallbackSlug(text) {
  const searchScore = scoreRule(text, [
    "search",
    "find",
    "discover",
    "research",
    "answer",
    "knowledge",
  ]);
  const automationScore = scoreRule(text, [
    "automation",
    "automate",
    "workflow",
    "integrations",
    "trigger",
    "agent",
  ]);
  const assistantScore = scoreRule(text, ["assistant", "chat", "copilot", "conversation", "help"]);
  const choices = [
    ["ai-search", searchScore],
    ["ai-automation", automationScore],
    ["ai-assistant", assistantScore],
  ].sort((a, b) => b[1] - a[1]);
  return choices[0][1] > 0 ? choices[0][0] : "ai-assistant";
}

function classify(tool, options) {
  const text = toolText(tool);
  const existingSlugs = tool.categories.map((item) => item.category.slug);
  const existingPrimary =
    tool.categories.find((item) => item.isPrimary)?.category.slug ?? existingSlugs[0] ?? null;
  const isProblematic = !existingPrimary || PROBLEMATIC_PRIMARY_SLUGS.has(existingPrimary);
  const scores = RULES.map(([slug, keywords]) => ({ slug, score: scoreRule(text, keywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scores[0];
  const strongEnough =
    top && top.score >= (isProblematic ? options.minScore : Math.max(options.minScore + 4, 8));
  const primary = strongEnough ? top.slug : isProblematic ? fallbackSlug(text) : existingPrimary;
  const secondary = scores
    .filter((item) => item.slug !== primary && item.score >= Math.max(options.minScore + 1, 4))
    .filter((item) => item.score >= 8)
    .slice(0, 1)
    .map((item) => item.slug);

  return {
    primary,
    categorySlugs: [...new Set([primary, ...secondary])],
    score: top?.score ?? 0,
    fallback: !strongEnough && isProblematic,
    preserved: !strongEnough && !isProblematic,
  };
}

async function ensureCategories(slugs) {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  const map = new Map(categories.map((category) => [category.slug, category]));
  const missing = slugs.filter((slug) => !map.has(slug));
  if (missing.length) {
    throw new Error(`Missing categories: ${missing.join(", ")}`);
  }
  return map;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const allRuleSlugs = [...new Set([...RULES.map(([slug]) => slug), ...FALLBACK_SLUGS])];
  const categoryMap = await ensureCategories(allRuleSlugs);
  const tools = await prisma.tool.findMany({
    where: { deletedAt: null, status: ToolStatus.PUBLISHED },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: options.limit || undefined,
    include: {
      categories: {
        where: { deletedAt: null },
        include: { category: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      tags: { where: { deletedAt: null }, include: { tag: true }, take: 12 },
    },
  });

  const summary = {
    scanned: tools.length,
    changed: 0,
    fallbackToThree: 0,
    dryRun: options.dryRun,
    distribution: {},
    examples: [],
  };

  for (const tool of tools) {
    const result = classify(tool, options);
    summary.distribution[result.primary] = (summary.distribution[result.primary] ?? 0) + 1;
    if (FALLBACK_SLUGS.includes(result.primary)) summary.fallbackToThree += 1;

    const existingSlugs = tool.categories.map((item) => item.category.slug);
    const existingPrimary =
      tool.categories.find((item) => item.isPrimary)?.category.slug ?? existingSlugs[0] ?? null;
    const changed =
      existingPrimary !== result.primary ||
      existingSlugs.length !== result.categorySlugs.length ||
      result.categorySlugs.some((slug) => !existingSlugs.includes(slug));

    if (!changed) continue;
    summary.changed += 1;
    if (summary.examples.length < 20) {
      summary.examples.push({
        slug: tool.slug,
        name: tool.name,
        from: existingSlugs,
        to: result.categorySlugs,
        score: result.score,
        fallback: result.fallback,
      });
    }

    if (options.dryRun) continue;

    await prisma.$transaction(async (tx) => {
      await tx.toolCategory.updateMany({
        where: { toolId: tool.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      for (let index = 0; index < result.categorySlugs.length; index += 1) {
        const slug = result.categorySlugs[index];
        const category = categoryMap.get(slug);
        const relationData = {
          isPrimary: index === 0,
          deletedAt: null,
          metadata: {
            source: "bulk-reclassification",
            score: result.score,
            fallback: result.fallback,
            generatedAt: new Date().toISOString(),
          },
        };
        await tx.toolCategory.upsert({
          where: {
            toolId_categoryId: {
              toolId: tool.id,
              categoryId: category.id,
            },
          },
          update: relationData,
          create: {
            toolId: tool.id,
            categoryId: category.id,
            ...relationData,
          },
        });
      }
    });
  }

  summary.distribution = Object.fromEntries(
    Object.entries(summary.distribution).sort((a, b) => b[1] - a[1]),
  );
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
