type MetricLabels = Record<string, string>;

const counters = new Map<string, number>();
const histograms = new Map<string, number[]>();

function metricKey(name: string, labels: MetricLabels): string {
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`);
  return parts.length ? `${name}{${parts.join(",")}}` : name;
}

export function incrementCounter(name: string, labels: MetricLabels = {}, delta = 1): void {
  const key = metricKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + delta);
}

export function observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
  const key = metricKey(name, labels);
  const bucket = histograms.get(key) ?? [];
  bucket.push(value);
  if (bucket.length > 1000) bucket.shift();
  histograms.set(key, bucket);
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  for (const [key, value] of counters) {
    lines.push(`${key} ${value}`);
  }

  for (const [key, values] of histograms) {
    const base = key.replace(/\{.*\}$/, "");
    const labels = key.includes("{") ? key.slice(key.indexOf("{")) : "";
    lines.push(`${base}_count${labels} ${values.length}`);
    lines.push(`${base}_sum${labels} ${values.reduce((a, b) => a + b, 0)}`);
    lines.push(`${base}_p95${labels} ${percentile(values, 95)}`);
  }

  return `${lines.join("\n")}\n`;
}

export function resetMetricsForTests(): void {
  counters.clear();
  histograms.clear();
}
