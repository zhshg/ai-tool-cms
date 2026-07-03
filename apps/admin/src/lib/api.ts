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
    if (normalized === window.location.origin) {
      return "";
    }
  }

  return value.replace(/\/$/, "");
}

function isHtmlResponse(contentType: string | null): boolean {
  return contentType?.toLowerCase().includes("text/html") ?? false;
}

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const publicOrigin = normalizeApiOrigin(clientEnv.NEXT_PUBLIC_API_URL);

    if (publicOrigin) {
      return `${publicOrigin}/v1`;
    }

    return "/v1";
  }

  const origin = normalizeApiOrigin(clientEnv.NEXT_PUBLIC_API_URL);
  return origin ? `${origin}/v1` : "/v1";
}

export function getAdminBasePath(): string {
  const configuredBasePath = (process.env.NEXT_PUBLIC_ADMIN_BASE_PATH || "").trim();
  if (configuredBasePath) {
    return configuredBasePath.startsWith("/") ? configuredBasePath : `/${configuredBasePath}`;
  }

  if (typeof window === "undefined") {
    return "/admin";
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[0] === "admin" ? "/admin" : "";
}

export function getAdminDashboardPath(): string {
  const basePath = getAdminBasePath();
  return basePath || "/";
}

export function getAdminLoginPath(): string {
  const basePath = getAdminBasePath();
  return `${basePath || ""}/login`;
}

export function getAdminRouterDashboardPath(): string {
  return "/";
}

export function getAdminRouterLoginPath(): string {
  return "/login";
}

export function normalizeAdminNextPath(nextPath: string | null | undefined): string {
  const fallback = getAdminRouterDashboardPath();
  const value = nextPath?.trim();

  if (!value) {
    return fallback;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) || value.startsWith("//")) {
    return fallback;
  }

  const [pathWithQuery = "", hashFragment = ""] = value.split("#", 2);
  const hash = hashFragment ? `#${hashFragment}` : "";
  const [pathname = "", query = ""] = pathWithQuery.split("?", 2);
  const search = query ? `?${query}` : "";
  const normalizedBasePath = getAdminBasePath();

  if (!pathname || pathname === "/") {
    return `${fallback}${search}${hash}`;
  }

  if (!pathname.startsWith("/")) {
    return `${fallback}${search}${hash}`;
  }

  if (normalizedBasePath && pathname.startsWith(`${normalizedBasePath}/`)) {
    const relativePath = pathname.slice(normalizedBasePath.length) || fallback;
    return `${relativePath}${search}${hash}`;
  }

  if (pathname === normalizedBasePath) {
    return `${fallback}${search}${hash}`;
  }

  if (pathname.startsWith("/admin/")) {
    return `${pathname.slice("/admin".length)}${search}${hash}`;
  }

  if (pathname === "/admin") {
    return `${fallback}${search}${hash}`;
  }

  return `${pathname}${search}${hash}`;
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

  const normalizedNext =
    nextPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const search = normalizedNext ? `?next=${encodeURIComponent(normalizedNext)}` : "";
  window.location.assign(`${getAdminLoginPath()}${search}`);
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

export async function readApiError(
  response: Response,
  fallbackMessage?: string,
): Promise<ApiError> {
  const contentType = response.headers.get("content-type");
  const body = await response.text();

  if (isHtmlResponse(contentType)) {
    return {
      status: response.status,
      message:
        fallbackMessage ||
        "API route returned HTML instead of JSON. Please verify nginx routes /v1/* to the API service.",
    };
  }

  return {
    status: response.status,
    message: body || fallbackMessage || response.statusText,
  };
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
    if (res.status === 401) {
      clearAdminTokens();
      redirectToAdminLogin();
    }
    throw await readApiError(res);
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

export type SeoProviderConfig = {
  enabled: boolean;
  siteUrl: string;
  propertyId: string;
  propertyName: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  apiKey?: string;
  verificationStatus: string;
  connectedAt?: string;
  disconnectedAt?: string;
  disconnectReason?: string;
  lastRefreshedAt?: string;
};

export type SeoGeneralConfig = {
  robots: string[];
  sitemapEnabled: boolean;
  canonicalEnabled: boolean;
  openGraphEnabled: boolean;
  twitterEnabled: boolean;
  indexNowEnabled: boolean;
  indexNowKey?: string;
  analyticsProvider: string;
  ga4MeasurementId?: string;
  ga4ApiSecret?: string;
};

export type SeoIntegrationSnapshot = {
  provider: string;
  configured: boolean;
  verificationStatus?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  siteUrl?: string | null;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  averagePosition?: number;
  indexedPages?: number;
  coverage?: number;
  sitemaps?: number;
  keywords?: number;
  indexStatus?: number;
  crawlErrors?: number;
  lastSyncedAt?: string | null;
  note?: string;
};

export type SeoIntegrationsResponse = {
  providers: {
    googleSearchConsole: {
      config: SeoProviderConfig;
      live: SeoIntegrationSnapshot;
    };
    bingWebmaster: {
      config: SeoProviderConfig;
      live: SeoIntegrationSnapshot;
    };
  };
  general: SeoGeneralConfig;
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
  summary?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  logoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  status: string;
  pricingModel: string;
  createdAt: string;
  updatedAt: string;
  completenessScore?: number;
  categories?: Array<{
    category: { id: string; name: string; slug: string; iconUrl?: string | null };
  }>;
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>;
  faqs?: Array<{ id: string; question: string; answer: string; sortOrder: number }>;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  iconUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
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

export type DashboardStatsResponse = {
  totalTools: number;
  publishedTools: number;
  draftTools: number;
  categories: number;
  tags: number;
  users: number;
  activeUsers: number;
  pendingAiReview: number;
  indexedTools: number;
  crawlerJobs: number;
  workerQueue: number;
  schedulerJobs: number;
  searchIndex: number;
  lastCrawl: string | null;
  systemHealth: {
    status: string;
    database: boolean;
    redis: boolean;
    meilisearch: boolean;
  };
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

export type ImportPreviewResponse = {
  format: "csv" | "json";
  total: number;
  records: Array<{
    index: number;
    name: string;
    slug: string;
    website: string;
    existing?: { id: string; slug: string; website: string; name: string } | null;
    warnings: string[];
  }>;
  readyToImport: number;
  duplicates: number;
};

export type ImportExecuteResponse = {
  importedCount: number;
  skippedCount: number;
  imported: Array<{ id: string; name: string; slug: string }>;
  skipped: Array<{ name: string; slug: string; reason: string }>;
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

export function fetchSeoIntegrations() {
  return apiFetch<SeoIntegrationsResponse>("/seo/integrations");
}

export function updateSeoIntegrations(payload: {
  googleSearchConsole?: Partial<SeoProviderConfig>;
  bingWebmaster?: Partial<SeoProviderConfig>;
  general?: Partial<SeoGeneralConfig>;
}) {
  return apiFetch<SeoIntegrationsResponse>("/seo/integrations", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function disconnectSeoIntegration(provider: "google" | "bing") {
  return apiFetch<SeoIntegrationsResponse>(`/seo/integrations/${provider}/disconnect`, {
    method: "POST",
  });
}

export function refreshSeoIntegration(provider: "google" | "bing") {
  return apiFetch<SeoIntegrationsResponse>(`/seo/integrations/${provider}/refresh`, {
    method: "POST",
  });
}

export function fetchTools() {
  return apiFetch<PaginatedResponse<AdminTool>>("/tools?pageSize=50");
}

export function fetchToolById(id: string) {
  return apiFetch<AdminTool & Record<string, unknown>>(`/tools/${id}`);
}

export function createTool(payload: Record<string, unknown>) {
  return apiFetch<AdminTool>("/tools", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTool(id: string, payload: Record<string, unknown>) {
  return apiFetch<AdminTool>(`/tools/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTool(id: string) {
  return apiFetch<{ id: string }>(`/tools/${id}`, {
    method: "DELETE",
  });
}

export function previewToolImport(format: "csv" | "json", content: string) {
  return apiFetch<ImportPreviewResponse>("/tools/import/preview", {
    method: "POST",
    body: JSON.stringify({ format, content }),
  });
}

export function executeToolImport(format: "csv" | "json", content: string, defaultStatus?: string) {
  return apiFetch<ImportExecuteResponse>("/tools/import/execute", {
    method: "POST",
    body: JSON.stringify({ format, content, defaultStatus }),
  });
}

export function bulkUpdateTools(payload: {
  toolIds: string[];
  status?: string;
  pricingModel?: string;
  categoryIds?: string[];
  tagIds?: string[];
  metadata?: Record<string, unknown>;
}) {
  return apiFetch<{ updated: number }>("/tools/bulk/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function bulkPublishTools(toolIds: string[]) {
  return apiFetch<{ published: number }>("/tools/bulk/publish", {
    method: "POST",
    body: JSON.stringify({ toolIds }),
  });
}

export function bulkRefreshToolLogos(toolIds: string[], force = true) {
  return apiFetch<{ queued: number; jobIds: string[] }>("/tools/bulk/logo-refresh", {
    method: "POST",
    body: JSON.stringify({ toolIds, force }),
  });
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

export function fetchCategoryById(id: string) {
  return apiFetch<AdminCategory>(`/categories/${id}`);
}

export function createCategory(payload: Record<string, unknown>) {
  return apiFetch<AdminCategory>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCategory(id: string, payload: Record<string, unknown>) {
  return apiFetch<AdminCategory>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCategory(id: string) {
  return apiFetch<{ id: string }>(`/categories/${id}`, {
    method: "DELETE",
  });
}

export function fetchTags() {
  return apiFetch<PaginatedResponse<{ id: string; name: string; slug: string }>>(
    "/tags?pageSize=100",
  );
}

export function fetchUsers() {
  return apiFetch<PaginatedResponse<AdminUser>>("/users?pageSize=50");
}

export function fetchUsersSummary() {
  return apiFetch<UsersSummary>("/users/summary");
}

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  const [stats, users] = await Promise.all([
    apiFetch<DashboardStatsResponse>("/operations/dashboard"),
    fetchUsersSummary().catch(() => ({
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
      roles: 0,
    })),
  ]);

  return {
    ...stats,
    users: stats.users ?? users.total ?? 0,
    activeUsers: users.active ?? 0,
    totalTools: stats.totalTools ?? 0,
    publishedTools: stats.publishedTools ?? 0,
    draftTools: stats.draftTools ?? 0,
    categories: stats.categories ?? 0,
    tags: stats.tags ?? 0,
    pendingAiReview: stats.pendingAiReview ?? 0,
    indexedTools: stats.indexedTools ?? 0,
    crawlerJobs: stats.crawlerJobs ?? 0,
    workerQueue: stats.workerQueue ?? 0,
    schedulerJobs: stats.schedulerJobs ?? 0,
    searchIndex: stats.searchIndex ?? 0,
    lastCrawl: stats.lastCrawl ?? null,
    systemHealth: stats.systemHealth ?? {
      status: "unknown",
      database: false,
      redis: false,
      meilisearch: false,
    },
  };
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

export function approveAiRevision(id: string, reviewNote?: string) {
  return apiFetch<AiRevision>(`/ai/revisions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ reviewNote }),
  });
}

export function rejectAiRevision(id: string, reviewNote?: string) {
  return apiFetch<AiRevision>(`/ai/revisions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewNote }),
  });
}

export function regenerateAiTool(toolId: string) {
  return apiFetch<{ toolId: string }>(`/ai/tools/${toolId}/regenerate`, {
    method: "POST",
  });
}

export function fetchCrawlerDashboard() {
  return apiFetch<CrawlerDashboard>("/crawler/dashboard");
}

export function fetchCrawlSources() {
  return apiFetch<PaginatedResponse<CrawlSource>>("/crawler/sources?pageSize=50");
}
