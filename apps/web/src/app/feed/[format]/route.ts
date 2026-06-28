import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

type Params = { params: Promise<{ format: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { format } = await params;
  const feedFormat = format.replace(/\.(xml|json)$/, "") as "rss" | "atom" | "json" | "api";

  try {
    const response = await fetch(`${API_URL}/v1/seo/feed/${feedFormat}`, {
      next: { revalidate: 600 },
    });
    if (response.ok) {
      const data = await response.json();
      return new NextResponse(
        typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2),
        { headers: { "Content-Type": data.contentType ?? "application/xml" } },
      );
    }
  } catch {
    /* empty feed */
  }

  return new NextResponse('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>', {
    headers: { "Content-Type": "application/rss+xml" },
  });
}
