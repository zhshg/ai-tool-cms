export class AiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
    readonly provider?: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export class AiProviderUnavailableError extends AiError {
  constructor(provider: string, reason?: string) {
    super(
      reason ? `Provider ${provider} unavailable: ${reason}` : `Provider ${provider} unavailable`,
      "PROVIDER_UNAVAILABLE",
      false,
      provider,
    );
    this.name = "AiProviderUnavailableError";
  }
}

export class AiRateLimitError extends AiError {
  constructor(provider: string, retryAfterMs?: number) {
    super(`Provider ${provider} rate limited`, "RATE_LIMIT", true, provider);
    this.name = "AiRateLimitError";
    if (retryAfterMs) {
      (this as { retryAfterMs?: number }).retryAfterMs = retryAfterMs;
    }
  }
}

export class AiProviderHttpError extends AiError {
  constructor(
    provider: string,
    readonly status: number,
    message: string,
  ) {
    super(message, "PROVIDER_HTTP_ERROR", status >= 500 || status === 429, provider);
    this.name = "AiProviderHttpError";
  }
}

export class AiContentPolicyError extends AiError {
  constructor(provider: string, message = "Content policy violation") {
    super(message, "CONTENT_POLICY", false, provider);
    this.name = "AiContentPolicyError";
  }
}

export class AiRouterExhaustedError extends AiError {
  constructor(message = "All AI providers failed") {
    super(message, "ROUTER_EXHAUSTED", false);
    this.name = "AiRouterExhaustedError";
  }
}

export function isRetryableAiError(error: unknown): boolean {
  return error instanceof AiError && error.retryable;
}
