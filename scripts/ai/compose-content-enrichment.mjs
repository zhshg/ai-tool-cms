import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const [key, inlineValue] = token.split("=", 2);
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
    } else {
      args.set(key, "true");
    }
  }
  return args;
}

function getArg(args, name, fallback = "") {
  const value = args.get(name);
  return value === undefined ? fallback : value;
}

function boolArg(args, name, defaultValue = false) {
  const value = args.get(name);
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const contentPath = path.resolve(process.cwd(), getArg(args, "--content"));
  const logoPath = path.resolve(process.cwd(), getArg(args, "--logos"));
  const outputPath = path.resolve(
    process.cwd(),
    getArg(args, "--output", "content-enrichment.json"),
  );
  const dryRun = boolArg(args, "--dry-run");

  const [contentRaw, logoRaw] = await Promise.all([
    readFile(contentPath, "utf8"),
    readFile(logoPath, "utf8").catch(() => JSON.stringify({ results: [] })),
  ]);

  const content = JSON.parse(contentRaw);
  const logos = JSON.parse(logoRaw);
  const logoByTool = new Map(
    (Array.isArray(logos.results) ? logos.results : []).map((item) => [item.id ?? item.slug, item]),
  );

  const enriched = (Array.isArray(content.results) ? content.results : []).map((item) => {
    const source = item.source ?? item.tool ?? item;
    const suggestion = item.suggestion ?? {};
    const logoMatch = logoByTool.get(source.id) ?? logoByTool.get(source.slug);
    return {
      id: source.id,
      slug: source.slug,
      name: source.name,
      website: source.website,
      contentSuggestion: suggestion,
      logoCandidates: logoMatch?.candidates ?? [],
      recommended: {
        summary: suggestion.summary ?? "",
        description: suggestion.description ?? "",
        metaTitle: suggestion.metaTitle ?? "",
        metaDescription: suggestion.metaDescription ?? "",
        categories: Array.isArray(suggestion.categories) ? suggestion.categories : [],
        tags: Array.isArray(suggestion.tags) ? suggestion.tags : [],
        features: Array.isArray(suggestion.features) ? suggestion.features : [],
        useCases: Array.isArray(suggestion.useCases) ? suggestion.useCases : [],
        alternatives: Array.isArray(suggestion.alternatives) ? suggestion.alternatives : [],
        faqs: Array.isArray(suggestion.faqs) ? suggestion.faqs : [],
      },
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    count: enriched.length,
    items: enriched,
  };

  if (dryRun) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
