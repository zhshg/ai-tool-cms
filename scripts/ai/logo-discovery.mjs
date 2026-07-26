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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), getArg(args, "--input"));
  const outputPath = path.resolve(process.cwd(), getArg(args, "--output", "logo-candidates.json"));
  const dryRun = boolArg(args, "--dry-run");
  const limit = Number(getArg(args, "--limit", "100"));

  if (!inputPath) throw new Error("Missing --input path");

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

  const sliced = tools.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 100);
  const results = [];

  for (const tool of sliced) {
    const website = normalizeText(tool.website);
    const domain = extractDomain(website);
    const candidates = unique([
      toUrl(tool.logoUrl),
      toUrl(tool.metadata?.logoUrl),
      toUrl(tool.metadata?.collectedLogoUrl),
      `${website.replace(/\/$/, "")}/favicon.ico`,
      domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : "",
      domain ? `https://${domain}/apple-touch-icon.png` : "",
      domain ? `https://${domain}/logo.png` : "",
      domain ? `https://${domain}/logo.svg` : "",
      domain ? `https://${domain}/images/logo.png` : "",
      domain ? `https://${domain}/images/logo.svg` : "",
    ]);

    const discovered = [];
    for (const candidate of candidates) {
      const response = await probeUrl(candidate);
      if (!response.ok) continue;
      discovered.push({
        url: candidate,
        contentType: response.contentType,
        status: response.status,
        source: guessSource(candidate),
      });
    }

    results.push({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      website,
      domain,
      candidates: discovered,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    count: results.length,
    dryRun,
    results,
  };

  if (dryRun) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

function toUrl(value) {
  const text = normalizeText(value);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function extractDomain(website) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function probeUrl(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
    };
  } catch {
    return { ok: false, status: 0, contentType: "" };
  }
}

function guessSource(url) {
  const lower = url.toLowerCase();
  if (lower.includes("google.com/s2/favicons")) return "google-favicon";
  if (lower.endsWith("/favicon.ico")) return "favicon";
  if (lower.includes("apple-touch-icon")) return "apple-touch-icon";
  if (lower.endsWith(".svg")) return "svg";
  if (lower.endsWith(".png")) return "png";
  return "custom";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
