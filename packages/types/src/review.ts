import type { ReviewStatus, Timestamps } from "./common";

export interface Review extends Timestamps {
  id: string;
  toolId: string;
  authorName?: string;
  rating: number;
  title?: string;
  body: string;
  status: ReviewStatus;
  publishedAt?: string;
}

export interface ReviewSummary {
  id: string;
  toolId: string;
  rating: number;
  title?: string;
  status: ReviewStatus;
}
