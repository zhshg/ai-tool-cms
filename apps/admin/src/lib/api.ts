import { clientEnv } from "@ai-tool-cms/config/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/v1`;

export type ApiError = {
  status: number;
  message: string;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("atcms_jwt") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw { status: res.status, message: body || res.statusText } satisfies ApiError;
  }

  return res.json() as Promise<T>;
}

export type SeoDashboardResponse = {
  report: {
    score: number;
    indexStatus: { indexed: number; pending: number; excluded: number };
    metrics: {
      missingMeta: number;
      missingSchema: number;
      duplicateTitles: number;
      brokenLinks: number;
      notFound404: number;
      lowContent: number;
      aiQualityLow: number;
    };
    issues: Array<{ code: string; severity: string; message: string; path?: string }>;
    generatedAt: string;
  };
  counts: { tools: number; categories: number; tags: number; comparePages: number };
  lastSnapshot: { score: number; createdAt: string } | null;
  sitemapChunks: string[];
};

export type SearchConsoleResponse = {
  google: Record<string, unknown>;
  bing: Record<string, unknown>;
};

export function fetchSeoDashboard() {
  return apiFetch<SeoDashboardResponse>("/seo/dashboard");
}

export function fetchSearchConsole() {
  return apiFetch<SearchConsoleResponse>("/seo/search-console");
}
