import { describe, expect, it } from "vitest";
import {
  buildMetadata,
  buildRobots,
  buildSitemapIndex,
  buildSitemapXml,
  buildSoftwareApplicationJsonLd,
  buildToolInternalLinks,
  PRESET_COMPARE_PAGES,
  scoreSeoHealth,
} from "./index";

describe("buildMetadata", () => {
  it("builds canonical, OG, twitter without hand-rolling", () => {
    const meta = buildMetadata({
      title: "ChatGPT",
      description: "AI chat assistant",
      path: "/en/tools/chatgpt",
    });
    expect(meta.title).toContain("ChatGPT");
    expect(meta.alternates.canonical).toContain("/en/tools/chatgpt");
    expect(meta.openGraph.title).toContain("ChatGPT");
  });
});

describe("JSON-LD", () => {
  it("builds SoftwareApplication schema", () => {
    const json = buildSoftwareApplicationJsonLd({
      name: "ChatGPT",
      description: "AI assistant",
      url: "https://example.com/tools/chatgpt",
      operatingSystem: "Web",
      offers: { price: "0", priceCurrency: "USD" },
      aggregateRating: { ratingValue: 4.5, ratingCount: 100 },
    });
    expect(json["@type"]).toBe("SoftwareApplication");
    expect(json.operatingSystem).toBe("Web");
    expect(json.aggregateRating).toBeTruthy();
  });
});

describe("sitemap", () => {
  it("builds sitemap index with chunk URLs", () => {
    const xml = buildSitemapIndex();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("/sitemaps/tool.xml");
    expect(xml).toContain("/sitemaps/compare.xml");
  });

  it("builds urlset xml with lastmod", () => {
    const xml = buildSitemapXml([
      { url: "/en/tools/chatgpt", lastModified: new Date("2026-01-01"), priority: 0.8 },
    ]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<lastmod>");
  });
});

describe("internal links", () => {
  it("generates at least 20 links per tool", () => {
    const links = buildToolInternalLinks({
      slug: "chatgpt",
      name: "ChatGPT",
      categorySlug: "chatbots",
      categoryName: "Chatbots",
      tagSlugs: ["free", "api"],
      relatedTools: Array.from({ length: 10 }, (_, i) => ({
        slug: `tool-${i}`,
        name: `Tool ${i}`,
      })),
    });
    expect(links.length).toBeGreaterThanOrEqual(20);
  });
});

describe("compare presets", () => {
  it("includes high-intent compare pages", () => {
    expect(PRESET_COMPARE_PAGES.some((p) => p.slug === "chatgpt-vs-claude")).toBe(true);
    expect(PRESET_COMPARE_PAGES.some((p) => p.slug === "best-chatgpt-alternatives")).toBe(true);
  });
});

describe("scoreSeoHealth", () => {
  it("penalizes missing meta and 404", () => {
    const report = scoreSeoHealth({
      pages: [
        { id: "1", path: "/a", title: null, metaDescription: null, statusCode: 404 },
        {
          id: "2",
          path: "/b",
          title: "OK",
          metaDescription: "desc",
          hasSchema: true,
          wordCount: 200,
        },
      ],
    });
    expect(report.score).toBeLessThan(100);
    expect(report.metrics.notFound404).toBe(1);
  });
});

describe("robots", () => {
  it("includes sitemap reference", () => {
    const txt = buildRobots();
    expect(txt).toContain("Sitemap:");
    expect(txt).toContain("Disallow: /api/");
  });
});
