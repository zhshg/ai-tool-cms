import { describe, expect, it } from "vitest";
import { buildAffiliateUrl } from "./networks";

describe("affiliate networks", () => {
  it("appends Amazon tag", () => {
    const url = buildAffiliateUrl("AMAZON", "https://example.com/product", { tag: "mytag-20" });
    expect(url).toContain("tag=mytag-20");
  });

  it("returns official URL for CUSTOM", () => {
    const url = buildAffiliateUrl("CUSTOM", "https://example.com");
    expect(url).toBe("https://example.com");
  });
});
