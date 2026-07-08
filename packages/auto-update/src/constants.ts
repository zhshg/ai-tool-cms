import { STANDARD_AI_CATEGORIES } from "@ai-tool-cms/common";
import type { SourceId } from "./types";

export const CATEGORY_WHITELIST = STANDARD_AI_CATEGORIES.map((category) => category.name);

export const CATEGORY_WHITELIST_SET = new Set<string>(CATEGORY_WHITELIST);

export const DEFAULT_SOURCE_LIMITS: Record<SourceId, number> = {
  producthunt: 50,
  taaft: 50,
  futurepedia: 50,
  "github-trending": 50,
  "huggingface-spaces": 100,
  hackernews: 50,
  "reddit-ai": 50,
};

export const SOURCE_NAMES: Record<SourceId, string> = {
  producthunt: "Product Hunt",
  taaft: "There's An AI For That",
  futurepedia: "Futurepedia",
  "github-trending": "GitHub Trending AI",
  "huggingface-spaces": "Hugging Face Spaces",
  hackernews: "Hacker News",
  "reddit-ai": "Reddit AI",
};
