import { describe, expect, it } from "vitest";
import { parseRssItems, scoreAiRelevance } from "./utils";

describe("discovery utils", () => {
  it("scores AI-related titles higher", () => {
    expect(scoreAiRelevance("New GPT coding agent")).toBeGreaterThan(0.4);
    expect(scoreAiRelevance("Weather forecast")).toBeLessThan(0.3);
  });

  it("parses RSS items", () => {
    const xml = `
      <rss><channel>
        <item><title>Tool A</title><link>https://example.com/a</link></item>
        <item><title>Tool B</title><link>https://example.com/b</link><description>AI helper</description></item>
      </channel></rss>
    `;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[1]?.description).toBe("AI helper");
  });
});
