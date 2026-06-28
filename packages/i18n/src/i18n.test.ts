import { describe, expect, it } from "vitest";
import { buildHreflangAlternates } from "./regional-seo";
import { buildFallbackChain } from "./resolve";

describe("i18n", () => {
  it("builds hreflang alternates", () => {
    const alts = buildHreflangAlternates("/tools/chatgpt");
    expect(alts.some((a) => a.locale === "ja" && a.path === "/ja/tools/chatgpt")).toBe(true);
    expect(alts.length).toBeGreaterThanOrEqual(10);
  });

  it("builds fallback chain", () => {
    expect(buildFallbackChain("zh-TW")).toContain("zh-CN");
    expect(buildFallbackChain("ja")).toContain("en");
  });
});
