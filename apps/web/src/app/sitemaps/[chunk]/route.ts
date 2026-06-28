import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

type Params = { params: Promise<{ chunk: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { chunk } = await params;
  const chunkName = chunk.replace(/\.xml$/, "");

  try {
    const response = await fetch(`${API_URL}/v1/seo/sitemaps/${chunkName}`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      return new NextResponse(await response.text(), {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      });
    }
  } catch {
    /* fallback empty sitemap */
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
