import type { PrismaClient } from "@ai-tool-cms/database";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  mcpCategorySearch,
  mcpCompareTools,
  mcpGetToolDetails,
  mcpLatestAiTools,
  mcpPricingQuery,
  mcpSearchTools,
} from "./handlers.js";

export function createMcpServer(prisma: PrismaClient): McpServer {
  const server = new McpServer({
    name: "ai-tool-cms",
    version: "1.0.0-rc.1",
  });

  server.registerTool(
    "search_ai_tools",
    {
      title: "AI Tool Search",
      description:
        "Search the AI Tool CMS directory by keyword with optional filters (category, tag, pricing, platform, language) and semantic ranking.",
      inputSchema: {
        keyword: z.string().describe("Search query, e.g. 'image generation' or 'coding assistant'"),
        category: z.string().optional().describe("Filter by category slug"),
        tag: z.string().optional().describe("Filter by tag slug"),
        pricing: z
          .string()
          .optional()
          .describe("Filter by pricing model: FREE, FREEMIUM, PAID, etc."),
        platform: z.string().optional().describe("Filter by platform"),
        language: z.string().optional().describe("Filter by language"),
        sort: z
          .enum(["relevance", "popularity", "newest", "rating"])
          .optional()
          .describe("Sort order"),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(50).optional(),
        semantic: z.boolean().optional().describe("Use semantic/vector reranking when available"),
      },
    },
    async (args) => {
      const result = await mcpSearchTools(prisma, {
        keyword: args.keyword,
        filters: {
          category: args.category,
          tag: args.tag,
          pricing: args.pricing,
          platform: args.platform,
          language: args.language,
        },
        sort: args.sort,
        page: args.page,
        pageSize: args.pageSize,
        semantic: args.semantic,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_tool_details",
    {
      title: "Tool Details",
      description:
        "Get full details for a published AI tool by slug: summary, FAQs, pros/cons, categories, tags, pricing plans, and related tools.",
      inputSchema: {
        slug: z.string().describe("Tool slug, e.g. 'chatgpt' or 'cursor'"),
        locale: z.string().optional().describe("Locale for localized content (default: en)"),
      },
    },
    async (args) => {
      const result = await mcpGetToolDetails(prisma, args.slug, args.locale ?? "en");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result ?? { error: "tool_not_found", slug: args.slug }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "compare_tools",
    {
      title: "Compare Tools",
      description:
        "Compare two or more AI tools by slug, or load a pre-built compare page by slug. Returns side-by-side summary, pricing, pros/cons, and use cases.",
      inputSchema: {
        slugs: z
          .array(z.string())
          .optional()
          .describe("Tool slugs to compare, e.g. ['chatgpt', 'claude']"),
        comparePageSlug: z
          .string()
          .optional()
          .describe("Pre-built SEO compare page slug from the CMS"),
      },
    },
    async (args) => {
      const result = await mcpCompareTools(prisma, {
        slugs: args.slugs,
        comparePageSlug: args.comparePageSlug,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "search_categories",
    {
      title: "Category Search",
      description:
        "List or search AI tool categories, or get all tools in a specific category by slug.",
      inputSchema: {
        query: z.string().optional().describe("Search categories by name or slug"),
        slug: z.string().optional().describe("Get tools in a specific category slug"),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async (args) => {
      const result = await mcpCategorySearch(prisma, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "query_pricing",
    {
      title: "Pricing Query",
      description:
        "Query pricing for a specific tool by slug, or find tools by pricing model / max monthly price.",
      inputSchema: {
        slug: z.string().optional().describe("Get detailed pricing plans for one tool"),
        pricingModel: z
          .string()
          .optional()
          .describe("Filter tools by pricing model: FREE, FREEMIUM, PAID, ENTERPRISE, etc."),
        maxAmount: z.number().optional().describe("Max plan amount in USD when listing tools"),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async (args) => {
      const result = await mcpPricingQuery(prisma, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "latest_ai_tools",
    {
      title: "Latest AI Tools",
      description:
        "Get trending or newly published AI tools. Use mode=trending for popularity-based list or mode=new for latest publishes.",
      inputSchema: {
        mode: z.enum(["trending", "new"]).optional().describe("trending (default) or new"),
        period: z
          .enum(["weekly", "monthly", "yearly"])
          .optional()
          .describe("Trending period when mode=trending"),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async (args) => {
      const result = await mcpLatestAiTools(prisma, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // Sprint 10 规范工具名（Commit 093）
  server.registerTool(
    "search_tools",
    {
      title: "Search Tools",
      description: "Search AI tools (canonical Sprint 10 name)",
      inputSchema: {
        keyword: z.string(),
        category: z.string().optional(),
        tag: z.string().optional(),
        pricing: z.string().optional(),
        limit: z.number().int().positive().max(50).optional(),
      },
    },
    async (args) => {
      const result = await mcpSearchTools(prisma, {
        keyword: args.keyword,
        filters: { category: args.category, tag: args.tag, pricing: args.pricing },
        pageSize: args.limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "get_tool",
    {
      title: "Get Tool",
      description: "Get tool details by slug",
      inputSchema: { slug: z.string(), locale: z.string().optional() },
    },
    async (args) => {
      const result = await mcpGetToolDetails(prisma, args.slug, args.locale ?? "en");
      return {
        content: [
          { type: "text", text: JSON.stringify(result ?? { error: "not_found" }, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "list_categories",
    {
      title: "List Categories",
      description: "List categories or tools in a category",
      inputSchema: {
        query: z.string().optional(),
        slug: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const result = await mcpCategorySearch(prisma, args);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "list_trending",
    {
      title: "List Trending",
      description: "Trending AI tools",
      inputSchema: {
        period: z.enum(["weekly", "monthly", "yearly"]).optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const result = await mcpLatestAiTools(prisma, { mode: "trending", ...args });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "get_pricing",
    {
      title: "Get Pricing",
      description: "Query tool pricing",
      inputSchema: { slug: z.string().optional(), pricingModel: z.string().optional() },
    },
    async (args) => {
      const result = await mcpPricingQuery(prisma, args);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "latest_tools",
    {
      title: "Latest Tools",
      description: "Newly published AI tools",
      inputSchema: { limit: z.number().optional() },
    },
    async (args) => {
      const result = await mcpLatestAiTools(prisma, { mode: "new", limit: args.limit });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}
