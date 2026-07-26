import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../../packages/database/generated/client/index.js";

function readArgValue(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === name) return argv[index + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function extractDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function main() {
  const prisma = new PrismaClient();
  const outArg = readArgValue(process.argv.slice(2), "--out");
  const outputPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.resolve(process.cwd(), "storage/imports/existing-tools-snapshot.json");

  try {
    const rows = await prisma.tool.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        website: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const payload = {
      generatedAt: new Date().toISOString(),
      total: rows.length,
      tools: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        website: row.website,
        websiteDomain: extractDomain(row.website),
        status: row.status,
      })),
    };

    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.info(`[tools:export-snapshot] total=${payload.total}`);
    console.info(`[tools:export-snapshot] output=${path.relative(process.cwd(), outputPath)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    `[tools:export-snapshot][error] ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
