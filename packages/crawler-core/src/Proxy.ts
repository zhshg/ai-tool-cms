import type { ProxyConfig } from "./types";
import type { CrawlRequest } from "./Request";

export type ProxyProvider = {
  readonly enabled: boolean;
  apply(request: CrawlRequest): CrawlRequest;
};

export class NoProxy implements ProxyProvider {
  readonly enabled = false;

  apply(request: CrawlRequest): CrawlRequest {
    return request;
  }
}

export class StaticProxy implements ProxyProvider {
  readonly enabled: boolean;

  constructor(private readonly config: ProxyConfig) {
    this.enabled = config.enabled && Boolean(config.url);
  }

  apply(request: CrawlRequest): CrawlRequest {
    if (!this.enabled || !this.config.url) {
      return request;
    }

    return {
      ...request,
      metadata: {
        ...request.metadata,
        proxyUrl: this.config.url,
        proxyAuth:
          this.config.username && this.config.password
            ? { username: this.config.username, password: this.config.password }
            : undefined,
      },
    };
  }
}

export function createProxyProvider(config?: ProxyConfig): ProxyProvider {
  if (!config?.enabled) {
    return new NoProxy();
  }
  return new StaticProxy(config);
}
