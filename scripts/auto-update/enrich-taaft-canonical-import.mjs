import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const getValue = (prefix) => argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const inputPath = argv[0];
  if (!inputPath) {
    throw new Error(
      "Usage: node scripts/auto-update/enrich-taaft-canonical-import.mjs <input-json> [--delay-ms=8000] [--timeout-ms=30000] [--retry=2]",
    );
  }

  const delayMs = Number(getValue("--delay-ms=") ?? "8000");
  const timeoutMs = Number(getValue("--timeout-ms=") ?? "30000");
  const retry = Number(getValue("--retry=") ?? "2");
  const browserWaitMs = Number(getValue("--browser-wait-ms=") ?? "15000");

  return {
    inputPath,
    delayMs: Number.isFinite(delayMs) ? Math.max(0, delayMs) : 8000,
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(1000, timeoutMs) : 30000,
    retry: Number.isFinite(retry) ? Math.max(0, retry) : 2,
    browserWaitMs: Number.isFinite(browserWaitMs) ? Math.max(1000, browserWaitMs) : 15000,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(String(value || ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueParagraphs(values) {
  return [...new Set(values.map((value) => stripHtml(value)).filter(Boolean))];
}

function cleanUrl(value) {
  const text = decodeHtml(String(value || "").trim());
  if (!text) return null;
  try {
    return new URL(text).toString();
  } catch {
    return null;
  }
}

function stripTrackingParams(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      const normalized = key.toLowerCase();
      if (
        normalized.startsWith("utm_") ||
        normalized === "ref" ||
        normalized === "source" ||
        normalized === "campaign" ||
        normalized === "medium" ||
        normalized === "via" ||
        normalized === "fpr"
      ) {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\?$/, "");
  } catch {
    return value;
  }
}

function stripAllQueryAndHash(value) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function normalizeOfficialWebsite(value) {
  const cleaned = cleanUrl(value);
  if (!cleaned) return null;

  try {
    const url = new URL(stripAllQueryAndHash(stripTrackingParams(cleaned)));
    const pathname = url.pathname.replace(/\/+$/, "");
    const singleSegment = pathname.split("/").filter(Boolean);

    if (singleSegment.length === 1) {
      const segment = singleSegment[0].toLowerCase();
      if (
        segment === "taaft" ||
        segment.startsWith("ref") ||
        segment.startsWith("deal") ||
        segment.startsWith("promo") ||
        segment.startsWith("offer")
      ) {
        url.pathname = "/";
      }
    }

    return url.toString();
  } catch {
    return stripAllQueryAndHash(stripTrackingParams(cleaned));
  }
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://toolsdar.io/",
      },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithRetry(url, options) {
  let lastError = null;
  for (let attempt = 0; attempt <= options.retry; attempt += 1) {
    if (attempt > 0) {
      await sleep(options.delayMs);
    }
    try {
      return await fetchText(url, options.timeoutMs);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unknown fetch error");
}

async function fetchTextWithBrowser(url, options) {
  const { chromium } = await import("@playwright/test").then((mod) => mod);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs,
    });
    try {
      await page.waitForSelector("#overview, #releases, div[id^='release-']", {
        timeout: options.browserWaitMs,
      });
    } catch {
      await page.waitForTimeout(options.browserWaitMs);
    }
    const extracted = await page.evaluate(() => {
      const textFromNodes = (selector) =>
        [...document.querySelectorAll(selector)]
          .map((node) => (node.textContent || "").trim())
          .filter(Boolean);

      const attrFromNode = (selector, attr) =>
        document.querySelector(selector)?.getAttribute(attr) || null;

      return {
        pageTitle: document.title || null,
        title: document.querySelector("h1")?.textContent?.trim() || document.title || null,
        summary:
          document.querySelector('meta[name="description"]')?.getAttribute("content") ||
          document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
          null,
        officialWebsite:
          attrFromNode("#ai_top_link", "href") ||
          attrFromNode("a.external_ai_link", "href") ||
          attrFromNode("a[rel='nofollow']", "href") ||
          null,
        logoUrl: attrFromNode("#overview img", "src") || attrFromNode(".taaft_icon", "src") || null,
        screenshotUrl:
          attrFromNode("#image_ai_link img", "src") || attrFromNode(".ai_image", "src") || null,
        overviewParagraphs: textFromNodes("#overview p"),
        releasesParagraphs: textFromNodes(
          "#releases p, div[id^='release-'] > div:nth-child(2) > div, div[id^='release-'] > div:nth-child(2) p",
        ),
      };
    });
    return {
      html: await page.content(),
      extracted,
    };
  } finally {
    await browser.close();
  }
}

function extractScreenshotUrl(html) {
  const value =
    html.match(/id="image_ai_link"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/id='image_ai_link'[^>]*>[\s\S]*?<img[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+class="[^"]*\bai_image\b[^"]*"[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*\bai_image\b[^"]*"/i)?.[1] ??
    html.match(/<img[^>]+class='[^']*\bai_image\b[^']*'[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+src='([^']+)'[^>]+class='[^']*\bai_image\b[^']*'/i)?.[1] ??
    null;
  return value ? stripTrackingParams(cleanUrl(value)) : null;
}

function extractLogoUrl(html) {
  const value =
    html.match(/id="overview"[\s\S]*?<img[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/id='overview'[\s\S]*?<img[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+class="[^"]*\btaaft_icon\b[^"]*"[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*\btaaft_icon\b[^"]*"/i)?.[1] ??
    html.match(/<img[^>]+class='[^']*\btaaft_icon\b[^']*'[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+src='([^']+)'[^>]+class='[^']*\btaaft_icon\b[^']*'/i)?.[1] ??
    null;
  return value ? cleanUrl(value) : null;
}

function extractSectionParagraphs(html, sectionId) {
  const block =
    html.match(new RegExp(`id="${sectionId}"[\\s\\S]*?<\\/section>`, "i"))?.[0] ??
    html.match(new RegExp(`id='${sectionId}'[\\s\\S]*?<\\/section>`, "i"))?.[0] ??
    html.match(new RegExp(`id="${sectionId}"[\\s\\S]*?<\\/div>\\s*<\\/div>`, "i"))?.[0] ??
    html.match(new RegExp(`id='${sectionId}'[\\s\\S]*?<\\/div>\\s*<\\/div>`, "i"))?.[0] ??
    null;

  if (!block) return [];
  const paragraphs = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(
    (match) => match[1] ?? "",
  );
  return uniqueParagraphs(paragraphs);
}

function extractReleaseParagraphs(html) {
  const standard = extractSectionParagraphs(html, "releases");
  if (standard.length) return standard;

  const blocks = [
    ...html.matchAll(
      /<div[^>]+id="release-[^"]+"[\s\S]*?<div[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
    ),
  ]
    .map((match) => match[1] ?? "")
    .flatMap((block) => {
      const paragraphs = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(
        (item) => item[1] ?? "",
      );
      if (paragraphs.length) return paragraphs;
      return [block];
    });

  return uniqueParagraphs(blocks);
}

function extractOfficialWebsite(html) {
  const raw =
    html.match(/id="ai_top_link"[^>]+href="([^"]+)"/i)?.[1] ??
    html.match(/id='ai_top_link'[^>]+href='([^']+)'/i)?.[1] ??
    html.match(/<a[^>]+class="[^"]*\bexternal_ai_link\b[^"]*"[^>]+href="([^"]+)"/i)?.[1] ??
    html.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*\bexternal_ai_link\b[^"]*"/i)?.[1] ??
    html.match(/<a[^>]+rel="nofollow"[^>]+href="([^"]+)"/i)?.[1] ??
    null;
  if (!raw) return null;
  const clean = cleanUrl(raw);
  return clean ? normalizeOfficialWebsite(clean) : null;
}

function extractSummary(html, fallbackValue) {
  const value =
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ??
    fallbackValue ??
    "";
  return stripHtml(value);
}

function extractName(html, fallbackValue) {
  const value =
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ??
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    fallbackValue ??
    "";
  return stripHtml(value)
    .replace(/\s*-\s*AI Tool For .+$/i, "")
    .trim();
}

function mergeDescription(base, overviewParagraphs, releasesParagraphs) {
  const parts = [String(base || "").trim()].filter(Boolean);
  if (overviewParagraphs.length) {
    parts.push(`Overview: ${overviewParagraphs.join(" ")}`);
  }
  if (releasesParagraphs.length) {
    parts.push(`Releases: ${releasesParagraphs.join(" ")}`);
  }
  return parts.join("\n\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workspaceRoot = process.cwd();
  const inputPath = path.resolve(workspaceRoot, options.inputPath);
  const outputPath = inputPath.replace(/\.json$/i, ".enriched.json");
  const record = JSON.parse(readFileSync(inputPath, "utf8"));

  const sourceUrl = record.source_urls?.[0] ?? record.sourceUrl ?? record.website ?? null;

  if (!sourceUrl) {
    throw new Error("source URL is missing in input record");
  }

  console.info(`[taaft:enrich] input=${path.relative(workspaceRoot, inputPath)}`);
  console.info(`[taaft:enrich] source=${sourceUrl}`);
  console.info(
    `[taaft:enrich] pacing delayMs=${options.delayMs} timeoutMs=${options.timeoutMs} retry=${options.retry} browserWaitMs=${options.browserWaitMs}`,
  );

  await sleep(options.delayMs);
  let html = "";
  let fetchMode = "http";
  let browserExtracted = null;
  try {
    html = await fetchTextWithRetry(sourceUrl, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/HTTP 403|Just a moment/i.test(message)) {
      throw error;
    }
    console.info("[taaft:enrich] http blocked by Cloudflare, switching to browser mode");
    await sleep(options.delayMs);
    const browserResult = await fetchTextWithBrowser(sourceUrl, options);
    if (/just a moment/i.test(browserResult.extracted?.pageTitle ?? "")) {
      throw new Error("Browser mode is still on Cloudflare challenge page");
    }
    html = browserResult.html;
    browserExtracted = browserResult.extracted;
    fetchMode = "browser";
  }

  const browserOverviewParagraphs = uniqueParagraphs(browserExtracted?.overviewParagraphs ?? []);
  const browserReleaseParagraphs = uniqueParagraphs(browserExtracted?.releasesParagraphs ?? []);
  const overviewParagraphs = browserOverviewParagraphs.length
    ? browserOverviewParagraphs
    : extractSectionParagraphs(html, "overview");
  const releasesParagraphs = browserReleaseParagraphs.length
    ? browserReleaseParagraphs
    : extractReleaseParagraphs(html);
  const screenshotUrl =
    (browserExtracted?.screenshotUrl
      ? stripTrackingParams(cleanUrl(browserExtracted.screenshotUrl))
      : null) || extractScreenshotUrl(html);
  const logoUrl =
    (browserExtracted?.logoUrl ? cleanUrl(browserExtracted.logoUrl) : null) || extractLogoUrl(html);
  const officialWebsite =
    (browserExtracted?.officialWebsite
      ? normalizeOfficialWebsite(browserExtracted.officialWebsite)
      : null) || extractOfficialWebsite(html);
  const summary = extractSummary(html, browserExtracted?.summary ?? record.summary);
  const name = extractName(html, browserExtracted?.title ?? record.name);

  const enriched = {
    ...record,
    name: name || record.name,
    website: officialWebsite ?? record.website,
    logo: logoUrl ?? record.logo ?? null,
    summary: summary || record.summary,
    screenshots: screenshotUrl ? [screenshotUrl] : (record.screenshots ?? []),
    description: mergeDescription(record.description, overviewParagraphs, releasesParagraphs),
    source_urls: [...new Set([...(record.source_urls ?? []), sourceUrl])],
    notes: [
      record.notes,
      officialWebsite
        ? `Official website refreshed from source detail page on ${new Date().toISOString()}.`
        : "Official website could not be refreshed automatically; preserved existing website field.",
    ]
      .filter(Boolean)
      .join(" "),
    metadata: {
      ...(record.metadata ?? {}),
      crawler: {
        sourceName: "There's An AI For That",
        sourceUrl,
        fetchMode,
        fetchedAt: new Date().toISOString(),
        pacing: {
          delayMs: options.delayMs,
          timeoutMs: options.timeoutMs,
          retry: options.retry,
          browserWaitMs: options.browserWaitMs,
        },
        extraction: {
          logoXPath: '//*[@id="overview"]/div[2]/div[1]/div[1]/div/img',
          screenshotXPath: '//*[@id="image_ai_link"]/img',
          overviewParagraphCount: overviewParagraphs.length,
          releasesParagraphCount: releasesParagraphs.length,
        },
      },
      overviewParagraphs,
      releasesParagraphs,
    },
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");

  console.info(`[taaft:enrich] output=${path.relative(workspaceRoot, outputPath)}`);
  console.info(
    `[taaft:enrich] mode=${fetchMode} overview=${overviewParagraphs.length} releases=${releasesParagraphs.length} screenshot=${screenshotUrl ? "yes" : "no"} logo=${logoUrl ? "yes" : "no"} officialWebsite=${officialWebsite ? "yes" : "no"}`,
  );
}

main().catch((error) => {
  console.error(`[taaft:enrich][error] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
