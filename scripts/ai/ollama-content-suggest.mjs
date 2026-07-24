import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen2.5:7b-q4km";

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

function boolArg(args, name, defaultValue = false) {
  const value = args.get(name);
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "";
}

function getArg(args, name, fallback = "") {
  const value = args.get(name);
  return value === undefined ? fallback : value;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTo(value, maxLength) {
  const text = normalizeText(value);
  if (!text) return "";
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), getArg(args, "--input"));
  const outputPath = path.resolve(
    process.cwd(),
    getArg(args, "--output", "content-suggestions.json"),
  );
  const ollamaUrl = getArg(args, "--ollama-url", DEFAULT_OLLAMA_URL).replace(/\/$/, "");
  const model = getArg(args, "--model", DEFAULT_MODEL);
  const dryRun = boolArg(args, "--dry-run");
  const limit = Number(getArg(args, "--limit", "50"));

  if (!inputPath) {
    throw new Error("Missing --input path");
  }

  const raw = await readFile(inputPath, "utf8");
  const payload = JSON.parse(raw);
  const tools = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.tools)
      ? payload.tools
      : payload;

  if (!Array.isArray(tools)) {
    throw new Error("Input JSON must contain an array or items/tools list");
  }

  const sliced = tools.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 50);
  const results = [];

  for (const tool of sliced) {
    const prompt = buildPrompt(tool);
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.9,
        },
        prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama request failed for ${tool.name || tool.slug || tool.id}: ${response.status}`,
      );
    }

    const data = await response.json();
    const text = normalizeText(data.response);
    const parsed = parseJsonBlock(text);
    results.push({
      source: tool,
      suggestion: parsed ?? { raw: text },
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    model,
    ollamaUrl,
    dryRun,
    count: results.length,
    results,
  };

  if (!dryRun) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

function buildPrompt(tool) {
  const metadata = normalizeObject(tool.metadata);
  const missing = Array.isArray(tool.missing) ? tool.missing : [];
  const lines = [
    "你是 AI 工具目录编辑助手。",
    "请只输出严格 JSON，不要输出解释文字。",
    "目标是帮助补全内容、SEO、相关信息和交叉补全素材。",
    "",
    `名称: ${normalizeText(tool.name)}`,
    `Slug: ${normalizeText(tool.slug)}`,
    `Website: ${normalizeText(tool.website)}`,
    `当前摘要: ${trimTo(tool.summary, 300)}`,
    `当前描述: ${trimTo(tool.description, 1200)}`,
    `当前长描述: ${trimTo(tool.longDescription, 2400)}`,
    `当前分类: ${
      Array.isArray(tool.categories)
        ? tool.categories
            .map((item) => item?.category?.name || item?.category?.slug)
            .filter(Boolean)
            .join(", ")
        : ""
    }`,
    `当前标签: ${
      Array.isArray(tool.tags)
        ? tool.tags
            .map((item) => item?.tag?.name || item?.tag?.slug)
            .filter(Boolean)
            .join(", ")
        : ""
    }`,
    `缺失项: ${missing.map((item) => item.label || item.key).join(", ")}`,
    `features: ${JSON.stringify(normalizeList(metadata.features))}`,
    `useCases: ${JSON.stringify(normalizeList(metadata.useCases))}`,
    `alternatives: ${JSON.stringify(normalizeList(metadata.alternatives))}`,
    `FAQ数量: ${Array.isArray(tool.faqs) ? tool.faqs.length : 0}`,
    "",
    "输出 JSON 结构：",
    "{",
    '  "summary": string,',
    '  "description": string,',
    '  "metaTitle": string,',
    '  "metaDescription": string,',
    '  "categories": [string, string?],',
    '  "tags": [string, string, string, string, string],',
    '  "features": [string, string, string, string],',
    '  "useCases": [string, string, string],',
    '  "alternatives": [string, string, string],',
    '  "faqs": [{"question": string, "answer": string}, ...],',
    '  "suggestion": string',
    "}",
    "",
    "要求：",
    "- 不要编造无法验证的产品事实。",
    "- 文案更适合目录页和 SEO。",
    "- 标签尽量覆盖场景、功能、行业和平台。",
    "- FAQ 要简短、可直接发布。",
  ];
  return lines.join("\n");
}

function parseJsonBlock(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  const jsonText = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 10);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
