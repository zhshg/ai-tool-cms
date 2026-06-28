export type ToolCMSClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

export type SearchParams = {
  q?: string;
  category?: string;
  tag?: string;
  pricing?: string;
  page?: number;
  pageSize?: number;
  semantic?: boolean;
};

export class ToolCMSClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ToolCMSClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "http://localhost:4000/v1/api/v1").replace(/\/$/, "");
    this.fetchFn = options.fetch ?? fetch;
  }

  private async request<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const response = await this.fetchFn(url.toString(), {
      headers: {
        "X-Api-Key": this.apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`ToolCMS API ${response.status}: ${text}`);
    }

    if (response.status === 304) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  search(params: SearchParams = {}) {
    return this.request("/search", {
      q: params.q,
      category: params.category,
      tag: params.tag,
      pricing: params.pricing,
      page: params.page,
      pageSize: params.pageSize,
      semantic: params.semantic,
    });
  }

  getTool(slug: string, locale?: string) {
    return this.request(`/tools/${slug}`, { locale });
  }

  listTools(limit?: number, cursor?: string) {
    return this.request("/tools", { limit, cursor });
  }

  compare(slugs: string[], comparePageSlug?: string) {
    return this.request("/compare", {
      slugs: slugs.join(","),
      comparePageSlug,
    });
  }

  listCategories(query?: string) {
    return this.request("/categories", { q: query });
  }

  trending(period: "weekly" | "monthly" | "yearly" = "weekly", limit?: number) {
    return this.request("/trending", { period, limit });
  }

  alternatives(slug: string, limit?: number) {
    return this.request(`/alternatives/${slug}`, { limit });
  }

  pricing(slug?: string, pricingModel?: string) {
    return this.request("/pricing", { slug, pricingModel });
  }

  latest(limit?: number, cursor?: string) {
    return this.request("/latest", { limit, cursor });
  }
}
