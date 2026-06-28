export type ProbeResult = {
  name: string;
  status: "up" | "down" | "degraded";
  latencyMs?: number;
  detail?: string;
};

export type HealthReport = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  probes: ProbeResult[];
};

export async function runProbe(
  name: string,
  fn: () => Promise<boolean>,
  timeoutMs = 3000,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const ok = await Promise.race([
      fn(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      ),
    ]);
    return {
      name,
      status: ok ? "up" : "down",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function aggregateHealth(probes: ProbeResult[]): HealthReport["status"] {
  if (probes.every((p) => p.status === "up")) return "healthy";
  if (probes.some((p) => p.name === "database" && p.status === "down")) return "unhealthy";
  return "degraded";
}
