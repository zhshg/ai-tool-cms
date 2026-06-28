import { describe, expect, it } from "vitest";
import { incrementCounter, renderPrometheusMetrics, resetMetricsForTests } from "./prometheus";
import { aggregateHealth } from "./health";

describe("monitoring", () => {
  it("renders prometheus counters", () => {
    resetMetricsForTests();
    incrementCounter("http_requests_total", { method: "GET", status: "200" });
    const body = renderPrometheusMetrics();
    expect(body).toContain("http_requests_total");
  });

  it("aggregates health probes", () => {
    expect(
      aggregateHealth([
        { name: "database", status: "up" },
        { name: "redis", status: "up" },
      ]),
    ).toBe("healthy");
    expect(
      aggregateHealth([
        { name: "database", status: "down" },
        { name: "redis", status: "up" },
      ]),
    ).toBe("unhealthy");
  });
});
