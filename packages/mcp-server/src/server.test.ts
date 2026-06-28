import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("mcp-server schemas", () => {
  it("validates search tool input", () => {
    const schema = z.object({
      keyword: z.string(),
      page: z.number().int().positive().optional(),
    });
    expect(schema.parse({ keyword: "chatgpt" })).toEqual({ keyword: "chatgpt" });
  });
});
