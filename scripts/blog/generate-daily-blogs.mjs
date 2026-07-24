import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const DEFAULT_LIMIT = 2;
const DEFAULT_CATEGORY_SLUG = "ai-tool-guides";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b";
const DEFAULT_TAGS = [
  { slug: "daily-ai-tools", name: "Daily AI Tools" },
  { slug: "ai-tool-guide", name: "AI Tool Guide" },
  { slug: "toolsdar-original", name: "ToolsDar Original" },
];
const DATE_PATTERN = /\b20\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b/g;

function parseArgs(argv) {
  const options = {
    limit: DEFAULT_LIMIT,
    publish: process.env.BLOG_AUTO_PUBLISH !== "false",
    dryRun: false,
    date: new Date(),
    ollama: process.env.BLOG_USE_OLLAMA !== "false",
    requireOllama: process.env.BLOG_REQUIRE_OLLAMA === "true",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--publish") options.publish = true;
    if (arg === "--draft") options.publish = false;
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--no-ollama") options.ollama = false;
    if (arg === "--ollama") options.ollama = true;
    if (arg === "--require-ollama") options.requireOllama = true;
    if (arg === "--limit") options.limit = Number(argv[index + 1] ?? DEFAULT_LIMIT);
    if (arg === "--date") options.date = new Date(argv[index + 1] ?? Date.now());
    if (arg === "--ollama-url") options.ollamaBaseUrl = argv[index + 1] ?? options.ollamaBaseUrl;
    if (arg === "--model") options.ollamaModel = argv[index + 1] ?? options.ollamaModel;
  }

  if (!Number.isFinite(options.limit) || options.limit < 1) {
    options.limit = DEFAULT_LIMIT;
  }
  if (Number.isNaN(options.date.getTime())) {
    options.date = new Date();
  }

  return options;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

function extractJsonObject(value) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function sentenceList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function sanitizeTitle(title) {
  return String(title)
    .replace(DATE_PATTERN, "")
    .replace(/\b(?:today|daily|on)\b\s*$/iu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([:|,-])\s*$/u, "")
    .trim()
    .slice(0, 220);
}

function normalizeCategoryPhrase(categoryName) {
  const value = String(categoryName || "").trim();
  return /\btools\b$/iu.test(value) ? value : `${value} tools`;
}

function normalizeCategoryLabel(categoryName) {
  return String(categoryName || "")
    .trim()
    .replace(/\s+/g, " ");
}

function buildCategoryContext(categoryName) {
  const label = normalizeCategoryLabel(categoryName);
  const lower = label.toLowerCase();

  if (/^ai\s+/iu.test(label)) {
    const domain = label.replace(/^AI\s+/u, "").trim();
    const lowerDomain = domain.toLowerCase();
    return {
      label,
      domain,
      phrase: `AI tools for ${lowerDomain}`,
      sentencePhrase: `AI tools for ${lowerDomain}`,
      taskPhrase: `${lowerDomain} work`,
    };
  }

  return {
    label,
    domain: label,
    phrase: `tools for ${lower}`,
    sentencePhrase: `tools for ${lower}`,
    taskPhrase: `${lower} work`,
  };
}

function cleanToolSummary(summary, toolName, categoryName) {
  const fallback = `${toolName} is listed in the ToolsDar ${categoryName} category for teams comparing AI tools.`;
  const value = String(summary || fallback)
    .replace(/<[^>]+>/g, " ")
    .replace(/\b([A-Z][A-Za-z0-9&+\- ]{2,})\1\b/g, "$1")
    .replace(/\b(\w+(?:\s+\w+)*)\1\b/gu, "$1")
    .replace(/\boffers users\b/giu, "offers")
    .replace(/\bthat helps users\b/giu, "that helps")
    .replace(/\s{2,}/g, " ")
    .trim();

  return value || fallback;
}

function buildCategoryIntro(categoryName, toolCount) {
  const context = buildCategoryContext(categoryName);
  return `This guide highlights standout ${context.phrase}, with ${toolCount} published options currently available on ToolsDar.`;
}

function buildQuickTake(categoryPhrase) {
  return `When comparing ${categoryPhrase}, start with the result you want, then weigh pricing, workflow fit, and how quickly each product can produce a usable outcome.`;
}

function buildHowToChoose(categoryName) {
  const context = buildCategoryContext(categoryName);
  return [
    `1. Define the specific ${context.taskPhrase} or workflow you want to improve.`,
    "2. Shortlist tools that clearly match the same use case or output format.",
    "3. Compare pricing, onboarding effort, and the quality of the final result.",
    "4. Review each ToolsDar tool page for categories, tags, alternatives, and related tools before deciding.",
  ].join("\n");
}

function normalizeInternalLinks(content, tools = []) {
  let normalized = String(content)
    .replace(/\bToolsDar page:\s*(?=\[[^\]]+\]\(\/en\/tools\/[^)]+\))/giu, "")
    .replace(
      /^-+\s*Directory page:\s*(\/en\/tools\/([a-z0-9-]+))\s*$/gimu,
      (_match, href, slug) => {
        const tool = tools.find((item) => item.slug === slug);
        const name = tool?.name ?? slug;
        return `- [${name}](${href})`;
      },
    )
    .replace(/\bDirectory page:\s*(\/en\/tools\/([a-z0-9-]+))/giu, (_match, href, slug) => {
      const tool = tools.find((item) => item.slug === slug);
      const name = tool?.name ?? slug;
      return `[${name}](${href})`;
    });

  for (const tool of tools) {
    normalized = normalized.replace(
      new RegExp(`(?<!\\]\\()(?<!/en/tools/)\\b/en/tools/${tool.slug}\\b`, "gu"),
      `[${tool.name}](/en/tools/${tool.slug})`,
    );
  }

  return removeRedundantToolLinkLines(autoLinkToolNames(normalized, tools));
}

function removeRedundantToolLinkLines(content) {
  const lines = String(content).split("\n");
  const kept = [];
  for (const line of lines) {
    const match = line.match(/^\s*-\s*\[[^\]]+\]\((\/en\/tools\/[^)]+)\)\s*$/iu);
    if (match && kept.slice(-8).some((item) => item.includes(`](${match[1]})`))) continue;
    kept.push(line);
  }
  return kept.join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function autoLinkToolNames(content, tools = []) {
  const placeholders = [];
  const protectedContent = String(content).replace(
    /```[\s\S]*?```|`[^`\n]+`|!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)/g,
    (segment) => {
      const key = `__TOOLS_LINK_PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(segment);
      return key;
    },
  );

  let normalized = protectedContent;
  const sortedTools = [...tools]
    .filter((tool) => tool?.name && tool?.slug)
    .sort((left, right) => right.name.length - left.name.length);

  for (const tool of sortedTools) {
    const escapedName = escapeRegExp(tool.name);
    const pattern = new RegExp(`(^|[^\\w])(${escapedName})(?=[^\\w]|$)`, "u");
    normalized = normalized.replace(
      pattern,
      (match, prefix, name) => `${prefix}[${name}](/en/tools/${tool.slug})`,
    );
  }

  return normalized.replace(/__TOOLS_LINK_PLACEHOLDER_(\d+)__/g, (_match, index) => {
    return placeholders[Number(index)] ?? "";
  });
}

async function ensureBlogCategory() {
  return prisma.blogCategory.upsert({
    where: { slug: DEFAULT_CATEGORY_SLUG },
    update: {
      name: "AI Tool Guides",
      description: "Daily editorial guides generated from ToolsDar directory data.",
    },
    create: {
      slug: DEFAULT_CATEGORY_SLUG,
      name: "AI Tool Guides",
      description: "Daily editorial guides generated from ToolsDar directory data.",
      sortOrder: 10,
      metadata: { source: "daily-blog-generator" },
    },
  });
}

async function ensureBlogTags() {
  const tags = [];
  for (const tag of DEFAULT_TAGS) {
    tags.push(
      await prisma.blogTag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: { ...tag, metadata: { source: "daily-blog-generator" } },
      }),
    );
  }
  return tags;
}

async function fetchCandidateCategories(limit) {
  return prisma.$queryRaw`
    select c.id, c.slug, c.name, c.description, count(*)::int as tool_count
    from categories c
    join tool_categories tc on tc.category_id = c.id and tc.deleted_at is null
    join tools t on t.id = tc.tool_id and t.deleted_at is null and t.status::text = 'PUBLISHED'
    where c.deleted_at is null
      and c.slug <> 'uncategorized'
    group by c.id, c.slug, c.name, c.description
    having count(*) >= 3
    order by md5(c.slug || current_date::text) asc
    limit ${limit}
  `;
}

async function fetchToolsForCategory(categoryId, limit = 5) {
  const rows = await prisma.toolCategory.findMany({
    where: {
      categoryId,
      deletedAt: null,
      tool: { deletedAt: null, status: ToolStatus.PUBLISHED },
    },
    orderBy: [{ isPrimary: "desc" }, { tool: { publishedAt: "desc" } }],
    take: limit,
    select: {
      tool: {
        select: {
          slug: true,
          name: true,
          summary: true,
          pricingModel: true,
          website: true,
          tags: {
            where: { deletedAt: null },
            take: 4,
            select: { tag: { select: { name: true } } },
          },
        },
      },
    },
  });

  return rows.map((row) => row.tool);
}

function buildFallbackArticle({ category, tools, dateKey }) {
  const categoryName = category.name;
  const categoryContext = buildCategoryContext(categoryName);
  const categoryPhrase = categoryContext.phrase;
  const toolNames = tools.map((tool) => tool.name);
  const topTools = sentenceList(toolNames.slice(0, 3));
  const title = sanitizeTitle(`Best ${categoryName} AI Tools to Watch`);
  const slug = `${dateKey}-${slugify(categoryName)}-ai-tools-guide`;
  const excerpt = `Explore leading ${categoryPhrase} on ToolsDar, including ${topTools || "useful options"}, with quick notes on pricing, fit, and selection.`;
  const metaDescription = excerpt.slice(0, 300);

  const toolSections = tools
    .map((tool, index) => {
      const tags = tool.tags.map((item) => item.tag.name).filter(Boolean);
      const tagLine = tags.length ? `\n- Best-fit signals: ${tags.join(", ")}` : "";
      return `### ${index + 1}. [${tool.name}](/en/tools/${tool.slug})

${cleanToolSummary(tool.summary, tool.name, categoryName)}

- Pricing model: ${tool.pricingModel.toLowerCase()}
${tagLine.trim()}`;
    })
    .join("\n\n");

  const content = `# ${title}

${buildCategoryIntro(categoryName, category.tool_count)}

## Quick Take

${buildQuickTake(categoryContext.sentencePhrase)}

## Tools Worth Reviewing

${toolSections}

## How to Choose

${buildHowToChoose(categoryName)}

## Editorial Notes

This article is based on ToolsDar catalog data from ${dateKey} and should be refreshed when the category changes or notable new tools are added.
`;

  return {
    title,
    slug,
    excerpt,
    content: normalizeInternalLinks(content, tools),
    metaTitle: sanitizeTitle(title).slice(0, 150),
    metaDescription,
    metadata: {
      source: "daily-blog-generator",
      generator: "template",
      topic: category.slug,
      dateKey,
      toolSlugs: tools.map((tool) => tool.slug),
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildOllamaPrompt({ category, tools, dateKey }) {
  const toolsPayload = tools.map((tool) => ({
    name: tool.name,
    slug: tool.slug,
    summary: tool.summary,
    pricingModel: tool.pricingModel,
    tags: tool.tags.map((item) => item.tag.name).filter(Boolean),
  }));

  return `Return ONLY one valid JSON object. No markdown fence. No comments.

JSON keys required: title, excerpt, metaTitle, metaDescription, content.

Task: write a concise English SEO article for ToolsDar about AI tools in "${category.name}".
Date: ${dateKey}
Internal links must use markdown links like [Tool Name](/en/tools/tool-slug).
Never write "Directory page:" or raw internal paths. Do not put a date or time in title.
Write in a natural editorial tone, not like a raw directory export.
Avoid phrases such as "listed in the category", "currently mapped in the catalog", and other repetitive filler.
Do not repeat a tool name immediately after its heading.
Keep each tool note specific, concise, and readable.
Use only these tools and summaries; do not invent features:
${JSON.stringify(toolsPayload)}

Field rules:
title: max 90 characters, no date, no time.
excerpt: 140-220 characters.
metaTitle: max 150 characters.
metaDescription: max 300 characters.
content: 250-400 words, markdown headings allowed, mention 3-5 supplied tools.
Prefer concrete wording over generic filler, but keep sentences natural and grammatical.
`;
}

async function generateArticleWithOllama({ category, tools, dateKey, options }) {
  if (!options.ollama) return null;

  const { controller, timer } = withTimeout(180_000);
  try {
    const response = await fetch(`${options.ollamaBaseUrl.replace(/\/$/u, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: options.ollamaModel,
        prompt: buildOllamaPrompt({ category, tools, dateKey }),
        stream: false,
        format: "json",
        options: {
          temperature: 0.65,
          num_ctx: 8192,
          num_predict: 550,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const payload = await response.json();
    const parsed =
      typeof payload.response === "string" ? extractJsonObject(payload.response) : null;
    if (!parsed?.title || !parsed?.content) {
      throw new Error("Ollama response did not include title/content JSON");
    }

    const fallback = buildFallbackArticle({ category, tools, dateKey });
    return {
      title: sanitizeTitle(parsed.title),
      slug: fallback.slug,
      excerpt: String(parsed.excerpt ?? fallback.excerpt).slice(0, 500),
      content: normalizeInternalLinks(parsed.content, tools),
      metaTitle: sanitizeTitle(parsed.metaTitle ?? parsed.title).slice(0, 150),
      metaDescription: String(parsed.metaDescription ?? parsed.excerpt ?? fallback.excerpt).slice(
        0,
        300,
      ),
      metadata: {
        ...fallback.metadata,
        generator: "ollama",
        ollamaModel: options.ollamaModel,
        ollamaBaseUrl: options.ollamaBaseUrl,
      },
    };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? `; cause: ${String(error.cause)}` : "";
    console.error(
      `[daily-blog] Ollama unavailable for ${category.slug}; falling back to template: ${
        error instanceof Error ? error.message : String(error)
      }${cause}`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function createArticle({ article, category, tags, publish, dryRun }) {
  const existing = await prisma.blogArticle.findUnique({ where: { slug: article.slug } });
  if (existing) {
    if (dryRun) {
      return { status: "dry-run", slug: article.slug, title: article.title, reason: "slug exists" };
    }

    const now = new Date();
    const updated = await prisma.blogArticle.update({
      where: { id: existing.id },
      data: {
        title: sanitizeTitle(article.title),
        excerpt: article.excerpt,
        content: article.content,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        status: publish ? ToolStatus.PUBLISHED : existing.status,
        publishedAt: publish ? (existing.publishedAt ?? now) : existing.publishedAt,
        metadata: {
          ...existing.metadata,
          ...article.metadata,
          normalizedBy: "daily-blog-generator",
          normalizedAt: now.toISOString(),
        },
      },
    });

    return {
      status: publish ? "published" : "updated",
      slug: updated.slug,
      title: updated.title,
      reason: "slug exists",
    };
  }

  if (dryRun) {
    return { status: "dry-run", slug: article.slug, title: article.title };
  }

  const now = new Date();
  const created = await prisma.blogArticle.create({
    data: {
      slug: article.slug,
      title: sanitizeTitle(article.title),
      excerpt: article.excerpt,
      content: normalizeInternalLinks(article.content),
      status: publish ? ToolStatus.PUBLISHED : ToolStatus.DRAFT,
      categoryId: category.id,
      publishedAt: publish ? now : null,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      metadata: article.metadata,
    },
  });

  await prisma.blogArticleTag.createMany({
    data: tags.map((tag) => ({ articleId: created.id, tagId: tag.id })),
    skipDuplicates: true,
  });

  return {
    status: publish ? "published" : "draft",
    slug: created.slug,
    title: created.title,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dateKey = formatDateKey(options.date);
  const blogCategory = options.dryRun ? null : await ensureBlogCategory();
  const tags = options.dryRun ? [] : await ensureBlogTags();
  const categories = await fetchCandidateCategories(options.limit * 4);
  const results = [];

  for (const candidate of categories) {
    if (results.length >= options.limit) break;
    const tools = await fetchToolsForCategory(candidate.id, 5);
    if (tools.length < 3) continue;
    const aiArticle = await generateArticleWithOllama({
      category: candidate,
      tools,
      dateKey,
      options,
    });
    if (!aiArticle && options.requireOllama) {
      results.push({
        status: "skipped",
        slug: `${dateKey}-${slugify(candidate.name)}-ai-tools-guide`,
        reason: "ollama unavailable",
      });
      continue;
    }
    const article = aiArticle ?? buildFallbackArticle({ category: candidate, tools, dateKey });
    const result = await createArticle({
      article,
      category: blogCategory,
      tags,
      publish: options.publish,
      dryRun: options.dryRun,
    });
    if (result.status !== "skipped") {
      results.push(result);
    }
  }

  console.log(
    JSON.stringify(
      {
        date: dateKey,
        requested: options.limit,
        publish: options.publish,
        dryRun: options.dryRun,
        ollama: options.ollama,
        requireOllama: options.requireOllama,
        ollamaModel: options.ollamaModel,
        created: results.length,
        results,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
