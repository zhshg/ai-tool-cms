import { describe, expect, it } from "vitest";
import { hashApiKey, hasScope, checkRateLimit } from "./api-keys";

describe("api-platform security (prod)", () => {
  it("hashes API keys deterministically", () => {
    const a = hashApiKey("atcms_test_key_123");
    expect(a).toBe(hashApiKey("atcms_test_key_123"));
  });

  it("enforces scopes", () => {
    expect(hasScope(["tools:read"], "tools:read")).toBe(true);
    expect(hasScope(["*"], "tools:read")).toBe(true);
  });

  it("rate limits per key", () => {
    const id = `test-${Date.now()}`;
    checkRateLimit(id, 2);
    checkRateLimit(id, 2);
    expect(checkRateLimit(id, 2).allowed).toBe(false);
  });
});
