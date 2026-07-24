import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const DEFAULT_LIMIT = 0;
const MIN_FAQS = 5;

function parseArgs(argv) {
  const options = {
    limit: DEFAULT_LIMIT,
    min: MIN_FAQS,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") options.limit = Number(argv[index + 1] ?? DEFAULT_LIMIT);
    if (arg === "--min") options.min = Number(argv[index + 1] ?? MIN_FAQS);
    if (arg === "--dry-run") options.dryRun = true;
  }

  if (!Number.isFinite(options.limit) || options.limit < 0) options.limit = DEFAULT_LIMIT;
  if (!Number.isFinite(options.min) || options.min < 3) options.min = MIN_FAQS;
  return options;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(value, fallback) {
  const text = cleanText(value);
  if (!text) return fallback;
  return text.endsWith(".") ? text : `${text}.`;
}

function listNames(items, fallback) {
  const names = items
    .map((item) => item.name)
    .filter(Boolean)
    .slice(0, 3);
  if (!names.length) return fallback;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function buildFaqs(tool) {
  const categoryName = tool.categories[0]?.category?.name ?? "AI tools";
  const tagNames = tool.tags
    .map((item) => item.tag.name)
    .filter(Boolean)
    .slice(0, 4);
  const summary = sentence(
    tool.summary || tool.description || tool.longDescription,
    `${tool.name} is an AI tool listed on ToolsDar for users comparing software in the ${categoryName} category.`,
  );
  const useCaseText = tagNames.length
    ? `${tool.name} is commonly evaluated for ${tagNames.join(", ")} workflows.`
    : `${tool.name} is commonly evaluated by teams looking for practical ${categoryName} workflows.`;
  const alternatives = listNames(tool.alternatives, `other ${categoryName} tools on ToolsDar`);

  return [
    {
      question: `What is ${tool.name}?`,
      answer: summary,
    },
    {
      question: `What can ${tool.name} be used for?`,
      answer: `${useCaseText} Review the tool summary, categories, tags, and related tools to decide whether it fits your workflow.`,
    },
    {
      question: `How much does ${tool.name} cost?`,
      answer: `${tool.name} is currently listed with a ${tool.pricingModel.toLowerCase()} pricing model. Check the official website for the latest plan details, limits, and billing terms.`,
    },
    {
      question: `Who should consider ${tool.name}?`,
      answer: `${tool.name} is worth considering if you need an AI tool in the ${categoryName} category and want to compare options by use case, pricing, and workflow fit.`,
    },
    {
      question: `What are good alternatives to ${tool.name}?`,
      answer: `Good alternatives to compare include ${alternatives}. Use ToolsDar categories, tags, and related-tool sections to shortlist similar products.`,
    },
  ];
}

async function fetchToolsNeedingFaqs(options) {
  const rows = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
      OR: [
        { faqs: { none: { deletedAt: null } } },
        {
          NOT: {
            faqs: {
              some: {
                deletedAt: null,
                sortOrder: { gte: options.min - 1 },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: options.limit || undefined,
    include: {
      categories: {
        where: { deletedAt: null },
        include: { category: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 3,
      },
      tags: {
        where: { deletedAt: null },
        include: { tag: true },
        take: 6,
      },
      faqs: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return rows;
}

async function fetchAlternatives(tool) {
  const categoryIds = tool.categories.map((item) => item.categoryId).filter(Boolean);
  if (!categoryIds.length) return [];

  const rows = await prisma.tool.findMany({
    where: {
      id: { not: tool.id },
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
      categories: { some: { deletedAt: null, categoryId: { in: categoryIds } } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: { name: true },
  });
  return rows;
}

async function fillToolFaqs(tool, options) {
  const existing = tool.faqs.filter((faq) => faq.deletedAt === null);
  if (existing.length >= options.min) {
    return { status: "skipped", created: 0 };
  }

  const alternatives = await fetchAlternatives(tool);
  const generated = buildFaqs({ ...tool, alternatives });
  const existingQuestions = new Set(existing.map((faq) => faq.question.trim().toLowerCase()));
  const missing = generated
    .filter((faq) => !existingQuestions.has(faq.question.trim().toLowerCase()))
    .slice(0, Math.max(0, options.min - existing.length));

  if (options.dryRun) {
    return { status: "dry-run", created: missing.length };
  }

  for (let index = 0; index < missing.length; index += 1) {
    const faq = missing[index];
    const sortOrder = existing.length + index;
    await prisma.faq.create({
      data: {
        toolId: tool.id,
        slug: slugify(faq.question) || `faq-${sortOrder + 1}`,
        question: faq.question.slice(0, 500),
        answer: faq.answer,
        sortOrder,
        metadata: {
          source: "faq-backfill",
          generatedAt: new Date().toISOString(),
          minFaqs: options.min,
        },
      },
    });
  }

  return { status: "filled", created: missing.length };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const tools = await fetchToolsNeedingFaqs(options);
  const summary = {
    scanned: tools.length,
    filledTools: 0,
    skippedTools: 0,
    createdFaqs: 0,
    dryRun: options.dryRun,
    min: options.min,
    limit: options.limit,
  };

  for (const tool of tools) {
    const result = await fillToolFaqs(tool, options);
    if (result.status === "skipped") summary.skippedTools += 1;
    else summary.filledTools += 1;
    summary.createdFaqs += result.created;
  }

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
