import { createLogger } from "@ai-tool-cms/logger";

const log = createLogger({ service: "observability" });

export type SpanAttributes = Record<string, string | number | boolean>;

let otelEnabled = false;
let traceApi: typeof import("@opentelemetry/api") | null = null;

export async function initObservability(serviceName: string): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const sentryDsn = process.env.SENTRY_DSN;

  if (endpoint) {
    try {
      traceApi = await import("@opentelemetry/api");
      otelEnabled = true;
      log.info("OpenTelemetry enabled", { serviceName, endpoint });
    } catch {
      log.warn("OpenTelemetry packages not available");
    }
  }

  if (sentryDsn) {
    try {
      const sentry = await import("@sentry/node");
      sentry.init({ dsn: sentryDsn, environment: process.env.NODE_ENV ?? "development" });
      log.info("Sentry initialized", { serviceName });
    } catch {
      log.info("Sentry DSN configured (install @sentry/node for full capture)", { serviceName });
    }
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
  const tracer = traceApi?.trace.getTracer("ai-tool-cms");
  const span = tracer?.startSpan(name, { attributes });

  try {
    const result = await fn();
    span?.setStatus({ code: traceApi?.SpanStatusCode.OK ?? 0 });
    recordMetric(`${name}.duration_ms`, Date.now() - start, {
      service: String(attributes.service ?? "app"),
    });
    return result;
  } catch (error) {
    span?.recordException(error instanceof Error ? error : new Error(String(error)));
    span?.setStatus({ code: traceApi?.SpanStatusCode.ERROR ?? 2 });
    log.error("span error", { name, durationMs: Date.now() - start, ...attributes, error });
    throw error;
  } finally {
    span?.end();
    log.debug("span complete", {
      name,
      durationMs: Date.now() - start,
      ...attributes,
      otelEnabled,
    });
  }
}

export function recordMetric(
  name: string,
  value: number,
  labels: Record<string, string> = {},
): void {
  log.info("metric", { name, value, ...labels });
}
