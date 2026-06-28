import { createLogger } from "@ai-tool-cms/logger";

const log = createLogger({ service: "observability" });

export type SpanAttributes = Record<string, string | number | boolean>;

let otelEnabled = false;

export async function initObservability(serviceName: string): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const sentryDsn = process.env.SENTRY_DSN;

  if (endpoint) {
    try {
      await import("@opentelemetry/api");
      otelEnabled = true;
      log.info("OpenTelemetry enabled", { serviceName, endpoint });
    } catch {
      log.warn("OpenTelemetry packages not available");
    }
  }

  if (sentryDsn) {
    log.info("Sentry DSN configured", { serviceName });
  }

  if (!endpoint && !sentryDsn) {
    log.info("Observability running in noop mode", { serviceName });
  }
}

export async function withSpan<T>(
  name: string,
  attributes: SpanAttributes,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    log.debug("span complete", {
      name,
      durationMs: Date.now() - start,
      ...attributes,
      otelEnabled,
    });
    return result;
  } catch (error) {
    log.error("span error", { name, durationMs: Date.now() - start, ...attributes, error });
    throw error;
  }
}

export function recordMetric(
  name: string,
  value: number,
  labels: Record<string, string> = {},
): void {
  log.debug("metric", { name, value, ...labels });
}
