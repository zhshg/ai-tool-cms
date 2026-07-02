import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = join(process.cwd(), "storage", "logos", safeFilename);

  try {
    const file = await readFile(filePath);
    const extension = safeFilename.split(".").pop()?.toLowerCase() ?? "png";
    const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
    return new NextResponse(file, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
