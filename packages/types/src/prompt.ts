import type { PromptStatus, Timestamps } from "./common";

export interface Prompt extends Timestamps {
  id: string;
  slug: string;
  title: string;
  content: string;
  description?: string;
  categoryId?: string;
  tagIds?: string[];
  status: PromptStatus;
  locale?: string;
}

export interface PromptSummary {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: PromptStatus;
}
