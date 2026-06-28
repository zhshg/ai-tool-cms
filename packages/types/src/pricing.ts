import type { BillingPeriod, PricingModel } from "./common";

export interface PricingTier {
  label: string;
  price?: number;
  currency?: string;
  period?: BillingPeriod;
  description?: string;
}

export interface Pricing {
  model: PricingModel;
  summary?: string;
  tiers?: PricingTier[];
}

export type { PricingModel, BillingPeriod };
