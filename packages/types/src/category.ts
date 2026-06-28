import type { Timestamps } from "./common";

export interface Category extends Timestamps {
  id: string;
  slug: string;
  name: string;
  description?: string;
  toolCount?: number;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}
