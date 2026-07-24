const { PrismaClient, ToolStatus } = require("../../packages/database/generated/client");

const prisma = new PrismaClient();
const DEFAULT_START_DATE = "2026-07-19T00:00:00.000Z";

function parseArgs(argv) {
  const options = {
    startDate: new Date(DEFAULT_START_DATE),
    dryRun: false,
    limit: 500,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--start-date") options.startDate = new Date(argv[index + 1] ?? DEFAULT_START_DATE);
    if (arg === "--limit") options.limit = Number(argv[index + 1] ?? options.limit);
  }

  if (Number.isNaN(options.startDate.getTime())) {
    options.startDate = new Date(DEFAULT_START_DATE);
  }
  if (!Number.isFinite(options.limit) || options.limit < 1) {
    options.limit = 500;
  }

  return options;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanBlogContent(content) {
  return restoreMarkdownLayout(String(content))
    .replace(
      /\bis useful for people exploring learning more about\b/giu,
      "helps people learn more about",
    )
    .replace(/\bsupports tool for\b/giu, "is a tool for")
    .replace(/\bsupports education assistant for\b/giu, "is an education assistant for")
    .replace(
      /\b([A-Z][A-Za-z0-9&+\- ]+?) is useful for people exploring learning more about\b/gu,
      "$1 helps people learn more about",
    )
    .replace(/\b([A-Z][A-Za-z0-9&+\- ]+?) supports tool for\b/gu, "$1 is a tool for")
    .replace(
      /\b([A-Z][A-Za-z0-9&+\- ]+?) supports education assistant for\b/gu,
      "$1 is an education assistant for",
    )
    .replace(/\bhelps with ([a-z][^.\n]*? assistant)\b/giu, "is a $1")
    .replace(/\bhelps with ([a-z][^.\n]*? tool)\b/giu, "is an $1")
    .replace(/\b([A-Z][A-Za-z0-9&+\- ]{2,})\1\b/g, "$1")
    .replace(/\b([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*)*)\s+tools\s+tools\b/gu, "$1 tools")
    .replace(/\boffers users\b/giu, "offers")
    .replace(/\bthat helps users\b/giu, "that helps")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n/g, "\n");
}

function restoreMarkdownLayout(content) {
  return String(content)
    .replace(/^(# [^\n]+)\s+(?=ToolsDar publishes\b)/u, "$1\n\n")
    .replace(/(## [^\n#]+?)\s+(?=If you are evaluating\b)/g, "$1\n\n")
    .replace(/\s+(## )/g, "\n\n$1")
    .replace(/\s+(### )/g, "\n\n$1")
    .replace(/###\s*\n(\d+\. )/g, "### $1")
    .replace(/([^\n])\s+(- Pricing model:)/g, "$1\n\n$2")
    .replace(/([^\n])\s+(- Best-fit signals:)/g, "$1\n$2")
    .replace(/([a-z\)])\s+(\d+\. )/g, "$1\n$2")
    .replace(/(### \d+\. \[[^\]]+\]\([^\n)]+\))\s+(?=[A-Z])/g, "$1\n\n")
    .replace(
      /([^\n])\s+(This article was generated from ToolsDar's published tool catalog)/g,
      "$1\n\n$2",
    )
    .replace(/(## How to Choose)\n(\d+\. )/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeDuplicateLeadToolLinks(content, tools = []) {
  let normalized = String(content);
  for (const tool of tools) {
    if (!tool?.name || !tool?.slug) continue;
    const escapedName = escapeRegExp(tool.name.trim());
    const href = `/en/tools/${tool.slug}`;
    const escapedHref = escapeRegExp(href);
    normalized = normalized.replace(
      new RegExp(
        `(###\\s+\\d+\\.\\s+\\[${escapedName}\\]\\(${escapedHref}\\)\\n\\n)\\[${escapedName}\\]\\(${escapedHref}\\)\\s+is\\b`,
        "gu",
      ),
      `$1${tool.name} is`,
    );
    normalized = normalized.replace(
      new RegExp(
        `(###\\s+\\d+\\.\\s+\\[${escapedName}\\]\\(${escapedHref}\\)\\n\\n)\\[${escapedName}\\]\\(${escapedHref}\\)\\b`,
        "gu",
      ),
      `$1${tool.name}`,
    );
    normalized = normalized.replace(
      new RegExp(
        `(###\\s+\\d+\\.\\s+\\[${escapedName}\\]\\(${escapedHref}\\))\\s+\\[${escapedName}\\]\\(${escapedHref}\\)\\s+is\\b`,
        "gu",
      ),
      `$1\n\n${tool.name} is`,
    );
    normalized = normalized.replace(
      new RegExp(
        `(###\\s+\\d+\\.\\s+\\[${escapedName}\\]\\(${escapedHref}\\))\\s+\\[${escapedName}\\]\\(${escapedHref}\\)\\b`,
        "gu",
      ),
      `$1\n\n${tool.name}`,
    );
    normalized = normalized.replace(
      new RegExp(
        `(###\\s+\\d+\\.\\s+\\[${escapedName}\\]\\(${escapedHref}\\)\\n\\n)\\[${escapedName}\\]\\(${escapedHref}\\)\\s+`,
        "gu",
      ),
      `$1${tool.name} `,
    );
    normalized = normalized.replace(
      new RegExp(
        `(###\\s+\\d+\\.\\s+\\[${escapedName}\\]\\(${escapedHref}\\))\\s+\\[${escapedName}\\]\\(${escapedHref}\\)\\s+`,
        "gu",
      ),
      `$1\n\n${tool.name} `,
    );
  }
  return normalized;
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
    const pattern = new RegExp(`(^|[^\\w])(${escapedName})(?=[^\\w]|$)`, "gu");
    normalized = normalized.replace(
      pattern,
      (_match, prefix, name) => `${prefix}[${name}](/en/tools/${tool.slug})`,
    );
  }

  return normalized.replace(/__TOOLS_LINK_PLACEHOLDER_(\d+)__/g, (_match, index) => {
    return placeholders[Number(index)] ?? "";
  });
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

  return cleanBlogContent(
    removeDuplicateLeadToolLinks(
      removeRedundantToolLinkLines(autoLinkToolNames(normalized, tools), tools),
      tools,
    ),
  );
}

function removeRedundantToolLinkLines(content, tools = []) {
  const lines = String(content).split("\n");
  const kept = [];
  for (const line of lines) {
    const match = line.match(/^\s*-\s*\[[^\]]+\]\((\/en\/tools\/[^)]+)\)\s*$/iu);
    if (match && kept.slice(-8).some((item) => item.includes(`](${match[1]})`))) continue;
    kept.push(line);
  }

  let normalized = kept.join("\n");
  for (const tool of tools) {
    if (!tool?.name || !tool?.slug) continue;
    const escapedName = escapeRegExp(tool.name.trim());
    const href = `/en/tools/${tool.slug}`;
    normalized = normalized.replace(
      new RegExp(`^(###\\s+\\d+\\.\\s+)${escapedName}(?=\\s*$)`, "gimu"),
      `$1[${tool.name}](${href})`,
    );
  }
  return normalized;
}

async function resolveTools(article) {
  const metadata = article.metadata && typeof article.metadata === "object" ? article.metadata : {};
  const toolSlugs = Array.isArray(metadata.toolSlugs)
    ? metadata.toolSlugs.filter((item) => typeof item === "string" && item.trim())
    : [];

  if (!toolSlugs.length) return [];

  return prisma.tool.findMany({
    where: {
      slug: { in: toolSlugs },
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
    },
    select: {
      slug: true,
      name: true,
    },
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const articles = await prisma.blogArticle.findMany({
    where: {
      createdAt: { gte: options.startDate },
      status: ToolStatus.PUBLISHED,
    },
    orderBy: { createdAt: "asc" },
    take: options.limit,
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
  });

  const results = [];

  for (const article of articles) {
    const tools = await resolveTools(article);
    const nextContent = normalizeInternalLinks(article.content, tools);
    const changed = nextContent !== article.content;
    const nextMetadata = {
      ...(article.metadata && typeof article.metadata === "object" ? article.metadata : {}),
      normalizedBy: "blog-internal-link-backfill",
      normalizedAt: new Date().toISOString(),
    };

    if (changed && !options.dryRun) {
      await prisma.blogArticle.update({
        where: { id: article.id },
        data: {
          content: nextContent,
          metadata: nextMetadata,
        },
      });
    }

    results.push({
      slug: article.slug,
      title: article.title,
      toolCount: tools.length,
      changed,
    });
  }

  console.log(
    JSON.stringify(
      {
        startDate: options.startDate.toISOString(),
        dryRun: options.dryRun,
        scanned: results.length,
        changed: results.filter((item) => item.changed).length,
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
