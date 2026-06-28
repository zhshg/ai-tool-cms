import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, hasScope } from "./api-keys";

describe("api-platform", () => {
  it("generates and hashes API keys", () => {
    const key = generateApiKey();
    expect(key.rawKey.startsWith("atcms_")).toBe(true);
    expect(hashApiKey(key.rawKey)).toBe(key.keyHash);
  });

  it("checks scopes", () => {
    expect(hasScope(["search:read"], "search:read")).toBe(true);
    expect(hasScope(["*"], "tools:read")).toBe(true);
    expect(hasScope(["tools:read"], "search:read")).toBe(false);
  });
});
