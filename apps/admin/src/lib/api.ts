import { clientEnv } from "@ai-tool-cms/config/client";

export type ApiError = {
  status: number;
  message: string;
};

const ACCESS_TOKEN_KEY = "atcms_jwt";
const REFRESH_TOKEN_KEY = "atcms_refresh_token";

function normalizeApiOrigin(origin: string | undefined): string {
  const value = origin?.trim();
  if (!value) return "";

  if (typeof window !== "undefined") {
    const normalized = value.replace(/\/$/, "");
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
    if (localhostPattern.test(normalized)) {
      return "";
    }

    if (normalized === window.location.origin) {
      return "";
    }
  }

  return value.replace(/\/$/, "");
}

export function getApiBase(): string {
  const origin = normalizeApiOrigin(clientEnv.NEXT_PUBLIC_API_URL);
  return origin ? `${origin}/v1` : "/v1";
}

export function getAdminBasePath(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[0] === "admin" ? "/admin" : "";
}

export function clearAdminTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function redirectToAdminLogin(nextPath?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const basePath = getAdminBasePath();
  const normalizedNext =
    nextPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const search = normalizedNext ? `?next=${encodeURIComponent(normalizedNext)}` : "";
  window.location.assign(`${basePath}/login${search}`);
}

export function getApiErrorMessage(error: ApiError): string {
  if (error.status === 401) {
    return "Unauthorized. Please sign in and make sure atcms_jwt is available.";
  }

  if (error.status === 403) {
    return "Forbidden. Your account does not have permission to access this resource.";
  }

  if (error.status === 0) {
    return "Network request failed. Please check the public API routing and try again.";
  }

  return error.message || "Request failed.";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;

  if (!token) {
    redirectToAdminLogin();
    throw {
      status: 401,
      message: "Missing authentication token.",
    } satisfies ApiError;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    throw {
      status: 0,
      message: "Failed to fetch",
    } satisfies ApiError;
  }

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) {
      clearAdminTokens();
      redirectToAdminLogin();
    }
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

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminTool = {
  id: string;
  name: string;
  slug: string;
  website: string;
  logoUrl?: string | null;
  status: string;
  pricingModel: string;
  createdAt: string;
  updatedAt: string;
  categories?: Array<{ category: { id: string; name: string; slug: string } }>;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName?: string | null;
  status: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: Array<{ id: string; code: string; name: string }>;
};

export type UsersSummary = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  roles: number;
};

export type AdminSetting = {
  id: string;
  key: string;
  value: unknown;
  group: string;
  description?: string | null;
  isPublic: boolean;
  updatedAt: string;
};

export type SettingsSummary = {
  total: number;
  publicSettings: number;
  privateSettings: number;
  groups: Array<{ name: string; count: number }>;
};

export type AiRevision = {
  id: string;
  stage: string;
  status: string;
  qualityScore?: number | null;
  reviewNote?: string | null;
  createdAt: string;
  tool?: { id: string; name: string; slug: string };
};

export type CrawlerDashboard = {
  todayCrawl: number;
  success: number;
  failed: number;
  pending: number;
  enabledSources: number;
  queue: {
    total: number;
    byName: Record<
      string,
      {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
      }
    >;
  };
  averageTimeMs: number;
  newTools: number;
  updatedTools: number;
};

export type CrawlSource = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  adapterType: string;
  status: string;
  schedule: string;
  priority: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
};

export function fetchSeoDashboard() {
  return apiFetch<SeoDashboardResponse>("/seo/dashboard");
}

export function fetchSearchConsole() {
  return apiFetch<SearchConsoleResponse>("/seo/search-console");
}

export function fetchTools() {
  return apiFetch<PaginatedResponse<AdminTool>>("/tools?pageSize=50");
}

export function refreshToolLogo(toolId: string, force = true) {
  return apiFetch<{ jobId: string }>(`/automation/logos/${toolId}`, {
    method: "POST",
    body: JSON.stringify({ force }),
  });
}

export function fetchCategories() {
  return apiFetch<PaginatedResponse<AdminCategory>>("/categories?pageSize=50");
}

export function fetchUsers() {
  return apiFetch<PaginatedResponse<AdminUser>>("/users?pageSize=50");
}

export function fetchUsersSummary() {
  return apiFetch<UsersSummary>("/users/summary");
}

export function fetchSettings() {
  return apiFetch<PaginatedResponse<AdminSetting>>("/settings?pageSize=50");
}

export function fetchSettingsSummary() {
  return apiFetch<SettingsSummary>("/settings/summary");
}

export function fetchAiRevisions(status: string) {
  return apiFetch<PaginatedResponse<AiRevision>>(
    `/ai/revisions?status=${encodeURIComponent(status)}&pageSize=50`,
  );
}

export function fetchCrawlerDashboard() {
  return apiFetch<CrawlerDashboard>("/crawler/dashboard");
}

export function fetchCrawlSources() {
  return apiFetch<PaginatedResponse<CrawlSource>>("/crawler/sources?pageSize=50");
}
