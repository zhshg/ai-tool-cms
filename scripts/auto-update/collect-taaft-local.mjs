import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const getValue = (prefix) => argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const delayMs = Number(getValue("--delay-ms=") ?? "5000");
  const pageWaitMs = Number(getValue("--page-wait-ms=") ?? "12000");
  const timeoutMs = Number(getValue("--timeout-ms=") ?? "60000");
  const maxTaskPages = Number(getValue("--max-task-pages=") ?? "0");
  const apiPageSize = Number(getValue("--api-page-size=") ?? "50");
  const apiMaxPages = Number(getValue("--api-max-pages=") ?? "0");
  const apiStart = Number(getValue("--api-start=") ?? "0");
  const apiEnd = Number(getValue("--api-end=") ?? "0");
  const warmupRounds = Number(getValue("--warmup-rounds=") ?? "2");
  const humanMoveCount = Number(getValue("--human-move-count=") ?? "6");
  const cookie = getValue("--cookie=") ?? "";
  const userAgent = getValue("--user-agent=") ?? "";
  const secChUa = getValue("--sec-ch-ua=") ?? "";
  const sessionFile = getValue("--session-file=") ?? "";

  return {
    delayMs: Number.isFinite(delayMs) ? Math.max(0, delayMs) : 5000,
    pageWaitMs: Number.isFinite(pageWaitMs) ? Math.max(1000, pageWaitMs) : 12000,
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(1000, timeoutMs) : 60000,
    maxTaskPages: Number.isFinite(maxTaskPages) ? Math.max(0, maxTaskPages) : 0,
    apiPageSize: Number.isFinite(apiPageSize) ? Math.max(1, Math.min(200, apiPageSize)) : 50,
    apiMaxPages: Number.isFinite(apiMaxPages) ? Math.max(0, apiMaxPages) : 0,
    apiStart: Number.isFinite(apiStart) ? Math.max(0, apiStart) : 0,
    apiEnd: Number.isFinite(apiEnd) ? Math.max(0, apiEnd) : 0,
    warmupRounds: Number.isFinite(warmupRounds) ? Math.max(0, Math.min(10, warmupRounds)) : 2,
    humanMoveCount: Number.isFinite(humanMoveCount) ? Math.max(0, Math.min(30, humanMoveCount)) : 6,
    cookie,
    userAgent,
    secChUa,
    sessionFile,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function normalizeTaskUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "theresanaiforthat.com") return null;
    if (!/\/task\//i.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "/");
  } catch {
    return null;
  }
}

function normalizeToolUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "theresanaiforthat.com") return null;
    const match = url.pathname.match(/\/ai\/([^/]+)\/?/i);
    if (!match?.[1]) return null;
    url.pathname = `/ai/${match[1]}/`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractToolSlug(value) {
  const normalized = normalizeToolUrl(value);
  const match = normalized?.match(/\/ai\/([^/]+)\/?$/i);
  return match?.[1] ?? null;
}

function buildMiniToolsMoreUrl(start, limit) {
  const params = new URLSearchParams({
    start: String(start),
    cursor: String(start),
    limit: String(limit),
    sort: "released",
    order: "desc",
    row_markup: "price-comments-popover-v1",
    home_listing: "1",
  });

  return `/api/mini-tools-more/?${params.toString()}`;
}

function parseCookieHeader(cookieHeader) {
  return String(cookieHeader || "")
    .split(/;\s*/)
    .map((entry) => {
      const index = entry.indexOf("=");
      if (index <= 0) return null;
      return {
        name: entry.slice(0, index).trim(),
        value: entry.slice(index + 1).trim(),
      };
    })
    .filter(Boolean);
}

function loadSessionOverrides(workspaceRoot, options) {
  if (!options.sessionFile) {
    return options;
  }

  const sessionPath = path.resolve(workspaceRoot, options.sessionFile);
  const sessionData = JSON.parse(readFileSync(sessionPath, "utf8"));

  return {
    ...options,
    cookie: sessionData.cookie || options.cookie,
    userAgent: sessionData.userAgent || options.userAgent,
    secChUa: sessionData.secChUa || options.secChUa,
  };
}

async function openStablePage(page, url, options) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await sleep(options.delayMs + randomBetween(500, 2500));
    }

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs,
    });

    try {
      await page.waitForSelector("a[href*='/task/'], a[href*='/ai/']", {
        timeout: options.pageWaitMs,
      });
    } catch {
      await page.waitForTimeout(options.pageWaitMs);
    }

    const title = await page.title();
    if (!/just a moment/i.test(title)) {
      return title;
    }
  }

  throw new Error(`Cloudflare challenge not cleared for ${url}`);
}

async function humanPause(baseMs, spreadMs = 1200) {
  await sleep(baseMs + randomBetween(150, spreadMs));
}

async function simulateHumanPresence(page, options) {
  const viewport = page.viewportSize() ?? { width: 1440, height: 900 };

  for (let index = 0; index < options.humanMoveCount; index += 1) {
    await page.mouse.move(
      randomBetween(40, Math.max(60, viewport.width - 40)),
      randomBetween(80, Math.max(120, viewport.height - 80)),
      { steps: randomBetween(8, 20) },
    );
    await humanPause(250, 500);
  }

  await page.mouse.wheel(0, randomBetween(200, 600));
  await humanPause(600, 900);
  await page.mouse.wheel(0, -randomBetween(120, 300));
  await humanPause(800, 1200);
}

async function warmupSession(page, options) {
  const warmupUrls = [
    "https://theresanaiforthat.com/",
    "https://theresanaiforthat.com/latest-ai-tools/",
    "https://theresanaiforthat.com/tasks/",
  ];

  for (let round = 0; round < options.warmupRounds; round += 1) {
    const url = warmupUrls[round % warmupUrls.length];
    console.info(`[taaft:collect] warmup ${round + 1}/${options.warmupRounds} ${url}`);
    await openStablePage(page, url, options);
    await simulateHumanPresence(page, options);
    await humanPause(1800, 2200);
  }
}

async function navigateViaSiteLinks(page, taskUrl, options) {
  try {
    const currentUrl = page.url();
    if (!/theresanaiforthat\.com/i.test(currentUrl)) {
      return false;
    }

    const clicked = await page.evaluate((targetUrl) => {
      const normalize = (value) => value.replace(/[#?].*$/, "").replace(/\/+$/, "/");
      const target = normalize(targetUrl);
      const links = [...document.querySelectorAll("a[href]")];
      const found =
        links.find((link) => normalize(link.href) === target) ||
        links.find((link) =>
          normalize(link.href).includes(target.replace("https://theresanaiforthat.com", "")),
        );
      if (!found) return false;
      found.click();
      return true;
    }, taskUrl);

    if (!clicked) {
      return false;
    }

    try {
      await page.waitForURL((value) => String(value).startsWith(taskUrl.replace(/\/+$/, "/")), {
        timeout: options.timeoutMs,
      });
    } catch {
      await page.waitForTimeout(options.pageWaitMs);
    }

    return true;
  } catch {
    return false;
  }
}

async function openTasksHub(page, options) {
  const currentUrl = page.url();
  if (/\/tasks\/?$/i.test(currentUrl) && !/just a moment/i.test(await page.title())) {
    return;
  }

  const clicked = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll("a[href]")];
    const found =
      candidates.find((link) => /\/tasks\/?$/i.test(link.href)) ||
      candidates.find((link) => (link.textContent || "").trim() === "Tasks");
    if (!found) return false;
    found.click();
    return true;
  });

  if (!clicked) {
    await openStablePage(page, "https://theresanaiforthat.com/tasks/", options);
    return;
  }

  try {
    await page.waitForURL(/\/tasks\/?$/i, { timeout: options.timeoutMs });
  } catch {
    await page.waitForTimeout(options.pageWaitMs);
  }

  if (/just a moment/i.test(await page.title())) {
    throw new Error("Cloudflare challenge not cleared for tasks hub");
  }

  await simulateHumanPresence(page, options);
  await humanPause(1500, 1800);
}

async function autoScrollUntilStable(page) {
  let stableRounds = 0;
  let previousCount = -1;

  for (let round = 0; round < 12; round += 1) {
    const count = await page
      .locator("a[href*='/ai/']")
      .count()
      .catch(() => 0);
    await page.mouse.wheel(0, randomBetween(800, 1500));
    await page.waitForTimeout(randomBetween(1800, 3200));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(randomBetween(2200, 4200));

    if (count === previousCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      previousCount = count;
    }

    if (stableRounds >= 2) {
      break;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(randomBetween(500, 1200));
}

async function extractPageData(page, pageUrl) {
  return page.evaluate((currentUrl) => {
    const allLinks = [...document.querySelectorAll("a[href]")].map((node) => ({
      href: node.href,
      text: (node.textContent || "").replace(/\s+/g, " ").trim(),
      className: String(node.className || ""),
      id: node.id || "",
    }));

    const taskCards = allLinks.filter((item) => item.className.includes("task-ai"));
    const candidateAiLinks = (
      taskCards.length ? taskCards : allLinks.filter((item) => item.href.includes("/ai/"))
    ).map((item) => ({
      href: item.href,
      text: item.text,
      className: item.className,
      id: item.id,
    }));

    const taskLinks = allLinks
      .map((item) => item.href)
      .filter((href) => href.includes("/task/") && !/\/tasks\/?$/.test(href));

    const pageTitle = document.title || "";
    const heading =
      document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || pageTitle;
    const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() || "";
    const countMatch = bodyText.match(/There are (\d+) AI tools for/i);

    return {
      currentUrl,
      pageTitle,
      heading,
      declaredToolCount: countMatch ? Number(countMatch[1]) : null,
      taskLinks,
      aiLinks: candidateAiLinks,
    };
  }, pageUrl);
}

function parseToolCardsFromHtml(html, pageUrl) {
  const found = [];
  const seen = new Set();
  const matches = html.matchAll(/<a\b[^>]+href=(["'])([^"']*\/ai\/[^"']+)\1[\s\S]*?<\/a>/gi);
  for (const match of matches) {
    const block = match[0] ?? "";
    const href = match[2] ?? "";
    const normalized = normalizeToolUrl(
      href.startsWith("http") ? href : new URL(href, pageUrl).toString(),
    );
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const text = block
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    found.push({
      href: normalized,
      text,
      className: "",
      id: "",
    });
  }

  return found;
}

async function fetchMiniToolsPage(page, start, limit, options) {
  return page.evaluate(
    async ({ primaryUrl, fallbackUrls, secChUa }) => {
      const candidates = [primaryUrl, ...fallbackUrls];

      const attemptResults = [];
      for (const url of candidates) {
        try {
          const response = await Promise.race([
            fetch(url, {
              headers: {
                accept: "text/html, */*;q=0.8",
                "x-requested-with": "fetch",
                ...(secChUa ? { "sec-ch-ua": secChUa } : {}),
              },
              credentials: "include",
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`mini-tools-more timeout for ${url}`)), 20000);
            }),
          ]);
          const body = await response.text();
          attemptResults.push({
            url,
            status: response.status,
            ok: response.ok,
            body,
          });

          if (response.ok && body && !/just a moment/i.test(body)) {
            return {
              ok: true,
              url,
              status: response.status,
              body,
              attempts: attemptResults.map((item) => ({
                url: item.url,
                status: item.status,
                ok: item.ok,
                bodyPreview: item.body.slice(0, 160),
              })),
            };
          }
        } catch (error) {
          attemptResults.push({
            url,
            status: 0,
            ok: false,
            body: String(error),
          });
        }
      }

      return {
        ok: false,
        url: attemptResults.at(-1)?.url ?? null,
        status: attemptResults.at(-1)?.status ?? 0,
        body: attemptResults.at(-1)?.body ?? "",
        attempts: attemptResults.map((item) => ({
          url: item.url,
          status: item.status,
          ok: item.ok,
          bodyPreview: String(item.body || "").slice(0, 160),
        })),
      };
    },
    {
      primaryUrl: buildMiniToolsMoreUrl(start, limit),
      fallbackUrls: [
        `/api/mini-tools-more/?start=${start}&cursor=${start}&limit=${limit}&sort=released&order=desc&home_listing=1`,
        `/api/mini-tools-more/?start=${start}&cursor=${start}&limit=${limit}&home_listing=1`,
      ],
      secChUa: options.secChUa,
    },
  );
}

async function main() {
  const workspaceRoot = process.cwd();
  const parsedOptions = parseArgs(process.argv.slice(2));
  const options = loadSessionOverrides(workspaceRoot, parsedOptions);
  const outputId = timestamp();
  const outputDir = path.join(workspaceRoot, "storage", "auto-update", "candidates");
  const snapshotPath = path.join(outputDir, `taaft-local-crawl-${outputId}.json`);
  const snapshotTempPath = `${snapshotPath}.tmp`;
  const browserStateDir = path.join(workspaceRoot, "storage", "auto-update", "browser");
  const browserStatePath = path.join(browserStateDir, "taaft-session.json");
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(browserStateDir, { recursive: true });

  const { chromium } = await import("@playwright/test").then((mod) => mod);
  const browser = await chromium.launch({ headless: true });

  const taskQueue = [];
  const seenTasks = new Set();
  const tools = new Map();
  const taskPages = [];
  const logs = [];
  const capturedMiniToolResponses = [];
  const seenMiniToolResponseUrls = new Set();

  const writeSnapshot = (processedTasks, queuedTasks) => {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      mode: "local-taaft-task-crawl",
      options,
      summary: {
        processedTasks,
        queuedTasks,
        discoveredTasks: seenTasks.size,
        uniqueTools: tools.size,
      },
      taskPages,
      tools: [...tools.values()].map((tool) => ({
        ...tool,
        sampleTexts: [...new Set(tool.sampleTexts ?? [])].slice(0, 5),
        sourcePages: [...new Set(tool.sourcePages ?? [])],
        sourceTasks: [...new Set(tool.sourceTasks ?? [])],
      })),
      logs,
    };

    writeFileSync(snapshotTempPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    renameSync(snapshotTempPath, snapshotPath);
  };

  try {
    const contextOptions = {
      userAgent:
        options.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "America/New_York",
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: {
        "accept-language": "en-US,en;q=0.9",
        ...(options.secChUa ? { "sec-ch-ua": options.secChUa } : {}),
      },
      storageState: existsSync(browserStatePath)
        ? JSON.parse(readFileSync(browserStatePath, "utf8"))
        : undefined,
    };
    const context = await browser.newContext(contextOptions);
    const initialCookies = parseCookieHeader(options.cookie);
    if (initialCookies.length > 0) {
      await context.addCookies(
        initialCookies.map((cookie) => ({
          ...cookie,
          domain: ".theresanaiforthat.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "None",
        })),
      );
    }
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (!/\/api\/mini-tools-more\/\?/i.test(url)) return;
      if (seenMiniToolResponseUrls.has(url)) return;
      seenMiniToolResponseUrls.add(url);

      let body = "";
      try {
        body = await response.text();
      } catch {
        body = "";
      }

      capturedMiniToolResponses.push({
        url,
        status: response.status(),
        ok: response.ok(),
        body,
      });
    });

    const enqueueTask = (url) => {
      const normalized = normalizeTaskUrl(url);
      if (!normalized || seenTasks.has(normalized)) return;
      seenTasks.add(normalized);
      taskQueue.push(normalized);
    };

    console.info("[taaft:collect] opening homepage");
    await warmupSession(page, options);
    await openStablePage(page, "https://theresanaiforthat.com/", options);
    await simulateHumanPresence(page, options);
    await autoScrollUntilStable(page);
    const homepage = await extractPageData(page, "https://theresanaiforthat.com/");
    await page.waitForTimeout(1500);

    homepage.taskLinks.forEach(enqueueTask);
    for (const item of homepage.aiLinks) {
      const normalized = normalizeToolUrl(item.href);
      if (!normalized) continue;
      const existing = tools.get(normalized) ?? {
        detailUrl: normalized,
        sampleTexts: [],
        sourcePages: [],
      };
      if (item.text) existing.sampleTexts.push(item.text);
      existing.sourcePages.push(homepage.currentUrl);
      tools.set(normalized, existing);
    }

    let homepageApiAdded = 0;
    for (const batch of capturedMiniToolResponses) {
      if (!batch.ok || !batch.body || /just a moment/i.test(batch.body)) continue;
      const aiLinks = parseToolCardsFromHtml(batch.body, "https://theresanaiforthat.com/");
      for (const item of aiLinks) {
        const normalized = normalizeToolUrl(item.href);
        if (!normalized || tools.has(normalized)) continue;
        homepageApiAdded += 1;
        tools.set(normalized, {
          detailUrl: normalized,
          sampleTexts: item.text ? [item.text] : [],
          sourcePages: [batch.url],
        });
      }
    }

    logs.push(
      `[homepage] tasks=${taskQueue.length} tools=${tools.size} capturedMiniTools=${capturedMiniToolResponses.length} homepageApiAdded=${homepageApiAdded}`,
    );
    console.info(
      `[taaft:collect] homepage tasks=${taskQueue.length} tools=${tools.size} capturedMiniTools=${capturedMiniToolResponses.length} homepageApiAdded=${homepageApiAdded}`,
    );
    writeSnapshot(0, taskQueue.length);

    let apiPage = 0;
    let apiStart = options.apiStart;
    let apiEmptyRounds = 0;
    const seenApiSlugs = new Set(
      [...tools.keys()].map((value) => extractToolSlug(value)).filter(Boolean),
    );

    while (apiEmptyRounds < 2) {
      if (options.apiMaxPages > 0 && apiPage >= options.apiMaxPages) {
        break;
      }
      if (options.apiEnd > 0 && apiStart > options.apiEnd) {
        break;
      }

      await sleep(options.delayMs);
      const batch = await fetchMiniToolsPage(page, apiStart, options.apiPageSize, options);
      apiPage += 1;

      if (!batch.ok) {
        const failureMessage = `[api] fail page=${apiPage} start=${apiStart} status=${batch.status} url=${batch.url ?? "unknown"} attempts=${JSON.stringify(batch.attempts ?? [])}`;
        logs.push(failureMessage);
        console.info(`[taaft:collect] ${failureMessage}`);
        writeSnapshot(0, taskQueue.length);
        break;
      }

      const aiLinks = parseToolCardsFromHtml(batch.body, "https://theresanaiforthat.com/");
      let added = 0;

      for (const item of aiLinks) {
        const normalized = normalizeToolUrl(item.href);
        const slug = extractToolSlug(item.href);
        if (!normalized || !slug || seenApiSlugs.has(slug)) continue;

        seenApiSlugs.add(slug);
        added += 1;
        const existing = tools.get(normalized) ?? {
          detailUrl: normalized,
          sampleTexts: [],
          sourcePages: [],
        };
        if (item.text) existing.sampleTexts.push(item.text);
        existing.sourcePages.push(
          batch.url ?? "https://theresanaiforthat.com/api/mini-tools-more/",
        );
        tools.set(normalized, existing);
      }

      logs.push(
        `[api] ok page=${apiPage} start=${apiStart} fetched=${aiLinks.length} added=${added} totalTools=${tools.size} url=${batch.url}`,
      );
      console.info(
        `[taaft:collect] api page=${apiPage} start=${apiStart} fetched=${aiLinks.length} added=${added} totalTools=${tools.size}`,
      );
      writeSnapshot(0, taskQueue.length);

      if (aiLinks.length === 0 || added === 0) {
        apiEmptyRounds += 1;
      } else {
        apiEmptyRounds = 0;
      }

      apiStart += options.apiPageSize;
    }

    let processedTasks = 0;
    while (taskQueue.length) {
      if (options.maxTaskPages === 0 || processedTasks >= options.maxTaskPages) {
        break;
      }

      const taskUrl = taskQueue.shift();
      processedTasks += 1;
      console.info(`[taaft:collect] task ${processedTasks} ${taskUrl}`);

      await humanPause(options.delayMs, 2500);
      try {
        console.info("[taaft:collect] opening tasks hub");
        await openTasksHub(page, options);
        console.info("[taaft:collect] navigating to task via site links");
        const navigatedByClick = await navigateViaSiteLinks(page, taskUrl, options);
        if (!navigatedByClick) {
          console.info("[taaft:collect] direct task navigation fallback");
          await openStablePage(page, taskUrl, options);
        } else {
          try {
            await page.waitForSelector("a[href*='/ai/'], a[href*='/task/']", {
              timeout: options.pageWaitMs,
            });
          } catch {
            await page.waitForTimeout(options.pageWaitMs);
          }
          if (/just a moment/i.test(await page.title())) {
            throw new Error(`Cloudflare challenge not cleared for ${taskUrl}`);
          }
        }
        await simulateHumanPresence(page, options);
        await autoScrollUntilStable(page);
        const taskData = await extractPageData(page, taskUrl);
        taskPages.push({
          taskUrl: taskData.currentUrl,
          taskName: taskData.heading,
          declaredToolCount: taskData.declaredToolCount,
          aiLinkCount: taskData.aiLinks.length,
        });

        taskData.taskLinks.forEach(enqueueTask);

        for (const item of taskData.aiLinks) {
          const normalized = normalizeToolUrl(item.href);
          if (!normalized) continue;
          const existing = tools.get(normalized) ?? {
            detailUrl: normalized,
            sampleTexts: [],
            sourcePages: [],
            sourceTasks: [],
          };
          if (item.text) existing.sampleTexts.push(item.text);
          existing.sourcePages.push(taskData.currentUrl);
          existing.sourceTasks.push(taskData.heading);
          tools.set(normalized, existing);
        }

        logs.push(
          `[task] ok name=${taskData.heading} aiLinks=${taskData.aiLinks.length} queue=${taskQueue.length} tools=${tools.size}`,
        );
      } catch (error) {
        logs.push(
          `[task] fail url=${taskUrl} error=${error instanceof Error ? error.message : String(error)}`,
        );
      }

      writeSnapshot(processedTasks, taskQueue.length);
    }

    console.info(
      `[taaft:collect] done tasks=${processedTasks} discoveredTasks=${seenTasks.size} uniqueTools=${tools.size}`,
    );
    console.info(`[taaft:collect] output=${path.relative(workspaceRoot, snapshotPath)}`);
    await context.storageState({ path: browserStatePath });
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`[taaft:collect][error] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
