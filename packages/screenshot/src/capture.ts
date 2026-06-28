import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Prisma, PrismaClient, ScreenshotVariant } from "@ai-tool-cms/database";
import { getEnv } from "@ai-tool-cms/config";

export type CaptureOptions = {
  url: string;
  variant: ScreenshotVariant;
  toolId: string;
};

export type CaptureResult = {
  storageKey: string;
  width: number;
  height: number;
  capturedAt: Date;
  metadata: Record<string, unknown>;
};

const VARIANT_VIEWPORTS: Record<
  ScreenshotVariant,
  { width: number; height: number; dark?: boolean }
> = {
  DESKTOP: { width: 1280, height: 720 },
  MOBILE: { width: 390, height: 844 },
  DARK: { width: 1280, height: 720, dark: true },
};

async function captureWithPlaywright(options: CaptureOptions): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const viewport = VARIANT_VIEWPORTS[options.variant];
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: viewport.dark ? "dark" : "light",
    });
    const page = await context.newPage();
    await page.goto(options.url, { waitUntil: "networkidle", timeout: 30_000 });
    const buffer = await page.screenshot({ fullPage: false, type: "png" });
    await context.close();
    return buffer;
  } finally {
    await browser.close();
  }
}

function placeholderPng(): Buffer {
  // 1x1 透明 PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

export async function captureScreenshot(options: CaptureOptions): Promise<CaptureResult> {
  const env = getEnv();
  const storageDir =
    process.env.SCREENSHOT_STORAGE_DIR ?? join(process.cwd(), "storage", "screenshots");
  await mkdir(storageDir, { recursive: true });

  let buffer: Buffer;
  let engine = "playwright";
  try {
    buffer = await captureWithPlaywright(options);
  } catch {
    engine = "placeholder";
    buffer = placeholderPng();
  }

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const filename = `${options.toolId}-${options.variant.toLowerCase()}-${hash}.png`;
  const filePath = join(storageDir, filename);
  await writeFile(filePath, buffer);

  const viewport = VARIANT_VIEWPORTS[options.variant];
  return {
    storageKey: filename,
    width: viewport.width,
    height: viewport.height,
    capturedAt: new Date(),
    metadata: { engine, filePath, appUrl: env.APP_URL },
  };
}

export async function captureToolScreenshots(
  prisma: PrismaClient,
  toolId: string,
  variants: ScreenshotVariant[] = ["DESKTOP", "MOBILE", "DARK"],
): Promise<number> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    select: { id: true, website: true },
  });
  if (!tool?.website) return 0;

  let saved = 0;
  for (const variant of variants) {
    const result = await captureScreenshot({ toolId, url: tool.website, variant });
    await prisma.toolScreenshot.upsert({
      where: { toolId_variant: { toolId, variant } },
      create: {
        toolId,
        variant,
        targetUrl: tool.website,
        storageKey: result.storageKey,
        width: result.width,
        height: result.height,
        capturedAt: result.capturedAt,
        metadata: result.metadata as Prisma.InputJsonValue,
      },
      update: {
        targetUrl: tool.website,
        storageKey: result.storageKey,
        width: result.width,
        height: result.height,
        capturedAt: result.capturedAt,
        metadata: result.metadata as Prisma.InputJsonValue,
      },
    });
    saved += 1;
  }
  return saved;
}
