import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadRouteModule() {
  vi.resetModules();
  return import("./route");
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("IndexNow key route", () => {
  it("returns the key as plain text when the filename matches", async () => {
    process.env.INDEXNOW_KEY = "test-indexnow-key";

    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://localhost/test-indexnow-key.txt"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("test-indexnow-key");
  });

  it("returns 404 when the filename does not match the configured key", async () => {
    process.env.INDEXNOW_KEY = "test-indexnow-key";

    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://localhost/wrong-key.txt"));

    expect(response.status).toBe(404);
  });
});
