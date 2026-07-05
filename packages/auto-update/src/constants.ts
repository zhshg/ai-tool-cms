import type { SourceId } from "./types";

export const CATEGORY_WHITELIST = [
  "Writing",
  "Image",
  "Video",
  "Audio",
  "Coding",
  "Productivity",
  "Marketing",
  "SEO",
  "Business",
  "Research",
  "Chatbot",
  "Design",
  "Automation",
  "Developer Tools",
] as const;

export const CATEGORY_WHITELIST_SET = new Set<string>(CATEGORY_WHITELIST);

export const DEFAULT_SOURCE_LIMITS: Record<SourceId, number> = {
  producthunt: 10,
  taaft: 10,
  futurepedia: 10,
  "github-trending": 10,
  "huggingface-spaces": 10,
  hackernews: 10,
  "reddit-ai": 10,
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
