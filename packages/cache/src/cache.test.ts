import { describe, expect, it } from "vitest";
import { cacheKey } from "./cache-aside";

describe("cacheKey", () => {
  it("builds deterministic keys", () => {
    expect(cacheKey(["tools", "list"])).toBe("atcms:tools:list");
  });

  it("hashes very long keys", () => {
    const key = cacheKey(["x".repeat(300)]);
    expect(key.startsWith("atcms:")).toBe(true);
    expect(key.length).toBeLessThan(30);
  });
});
