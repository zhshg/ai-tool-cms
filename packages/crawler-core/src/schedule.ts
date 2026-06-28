export type CrawlScheduleType = "HOURLY" | "DAILY" | "WEEKLY" | "MANUAL";

export function computeNextRunAt(
  schedule: CrawlScheduleType,
  crawlIntervalMinutes: number,
  from: Date = new Date(),
): Date | null {
  switch (schedule) {
    case "HOURLY":
      return new Date(from.getTime() + 60 * 60 * 1000);
    case "DAILY":
      return new Date(from.getTime() + crawlIntervalMinutes * 60 * 1000);
    case "WEEKLY":
      return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MANUAL":
      return null;
    default:
      return null;
  }
}

export function isSourceRunnable(status: string): boolean {
  return status === "ENABLED";
}
