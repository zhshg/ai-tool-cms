export type ISODateString = string;

export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export const ToolStatus = {
  Draft: "DRAFT",
  InReview: "IN_REVIEW",
  Approved: "APPROVED",
  Scheduled: "SCHEDULED",
  Published: "PUBLISHED",
  Archived: "ARCHIVED",
} as const;

export type ToolStatus = (typeof ToolStatus)[keyof typeof ToolStatus];

export const PricingModel = {
  Free: "FREE",
  Freemium: "FREEMIUM",
  Paid: "PAID",
  Contact: "CONTACT",
} as const;

export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel];

export const ReviewStatus = {
  Pending: "PENDING",
  Approved: "APPROVED",
  Rejected: "REJECTED",
  Published: "PUBLISHED",
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const PromptStatus = {
  Draft: "DRAFT",
  Published: "PUBLISHED",
  Archived: "ARCHIVED",
} as const;

export type PromptStatus = (typeof PromptStatus)[keyof typeof PromptStatus];

export const BillingPeriod = {
  Monthly: "monthly",
  Yearly: "yearly",
  OneTime: "one_time",
  Custom: "custom",
} as const;

export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod];
