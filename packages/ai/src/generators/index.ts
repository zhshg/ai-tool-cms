import type { AIProvider } from "../AIProvider";
import { AIFactory } from "../AIFactory";
import type { ProviderId } from "../types";
import { PromptEngine, type ToolPromptContext } from "../prompt-engine/PromptEngine";
import { clampScore, parseJsonFromLlm } from "../utils/json";
import { getMockGeneratorOutput } from "./mock-outputs";

export type GeneratorOptions = {
  provider?: AIProvider;
  providerId?: ProviderId;
  promptEngine?: PromptEngine;
  maxTokens?: number;
};

export type SummaryOutput = {
  oneSentence: string;
  oneParagraph: string;
  longDescription: string;
  featureHighlights: string[];
};

export type FeatureExtractionOutput = {
  features: string[];
  pricing: { model?: string; notes?: string };
  platforms: string[];
  languages: string[];
  integrations: string[];
  targetUsers: string[];
  useCases: string[];
};

export type ProsConsOutput = {
  pros: string[];
  cons: string[];
  verdict?: string;
};

export type FaqItem = { question: string; answer: string };

export type SeoOutput = {
  title: string;
  metaDescription: string;
  keywords: string[];
  canonical?: string;
  openGraph?: Record<string, string>;
  twitterCard?: Record<string, string>;
  jsonLd?: Record<string, unknown>;
};

export type GeoOutput = {
  aiAnswer: string;
  llmSummary: string;
  knowledgeGraph?: Record<string, unknown>;
  structuredFacts?: Array<{ fact: string; confidence?: string }>;
  semanticParagraphs?: string[];
  questionClusters?: string[][];
};

export type QualityScoreOutput = {
  overall: number;
  readability: number;
  seo: number;
  completeness: number;
  spamRisk: number;
  hallucinationRisk: number;
  duplicateRisk: number;
  passed: boolean;
  notes?: string;
};

export const QUALITY_THRESHOLD = 80;

async function runPromptJson<T>(
  templateId: Parameters<PromptEngine["buildMessages"]>[0],
  ctx: ToolPromptContext,
  options: GeneratorOptions = {},
): Promise<T> {
  const engine = options.promptEngine ?? new PromptEngine();
  const provider = options.provider ?? AIFactory.create(options.providerId ?? "mock");

  if (provider.id === "mock") {
    return getMockGeneratorOutput<T>(templateId, ctx);
  }

  const messages = engine.buildMessages(templateId, ctx);
  const response = await provider.chat({
    messages,
    maxTokens: options.maxTokens ?? 2000,
    temperature: 0.4,
  });

  return parseJsonFromLlm<T>(response.content);
}

/** Commit 033 — Summary generator */
export async function generateSummary(
  ctx: ToolPromptContext,
  options?: GeneratorOptions,
): Promise<SummaryOutput> {
  return runPromptJson<SummaryOutput>("summary", ctx, options);
}

/** Commit 034 — Feature / attribute extraction */
export async function extractFeatures(
  ctx: ToolPromptContext,
  options?: GeneratorOptions,
): Promise<FeatureExtractionOutput> {
  return runPromptJson<FeatureExtractionOutput>("feature", ctx, options);
}

/** Sprint 5 — Pros / cons generator */
export async function generateProsCons(
  ctx: ToolPromptContext,
  options?: GeneratorOptions,
): Promise<ProsConsOutput> {
  return runPromptJson<ProsConsOutput>("pros-cons", ctx, options);
}

/** Commit 035 — FAQ generator (JSON array) */
export async function generateFaq(
  ctx: ToolPromptContext,
  options?: GeneratorOptions,
): Promise<FaqItem[]> {
  const result = await runPromptJson<FaqItem[] | { faqs: FaqItem[] }>("faq", ctx, options);
  return Array.isArray(result) ? result : (result.faqs ?? []);
}

/** Commit 036 — SEO generator */
export async function generateSeo(
  ctx: ToolPromptContext,
  options?: GeneratorOptions,
): Promise<SeoOutput> {
  return runPromptJson<SeoOutput>("seo", ctx, options);
}

/** Commit 037 — GEO generator */
export async function generateGeo(
  ctx: ToolPromptContext,
  options?: GeneratorOptions,
): Promise<GeoOutput> {
  return runPromptJson<GeoOutput>("geo", ctx, options);
}

/** Commit 038 — Quality scoring */
export function scoreQuality(input: {
  summary?: string;
  longDescription?: string;
  features?: string[];
  faqCount?: number;
  hasSeo?: boolean;
  hasGeo?: boolean;
}): QualityScoreOutput {
  const text = `${input.summary ?? ""} ${input.longDescription ?? ""}`.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const readability = wordCount >= 30 && wordCount <= 800 ? 90 : wordCount < 10 ? 40 : 70;
  const seo = input.hasSeo ? 85 : 50;
  const completeness = Math.min(
    100,
    (input.summary ? 25 : 0) +
      (input.longDescription ? 25 : 0) +
      ((input.features?.length ?? 0) > 0 ? 20 : 0) +
      ((input.faqCount ?? 0) >= 3 ? 20 : 0) +
      (input.hasGeo ? 10 : 0),
  );
  const spamRisk = /best ever|#1|guaranteed/i.test(text) ? 60 : 15;
  const hallucinationRisk = wordCount < 10 ? 70 : 20;
  const duplicateRisk = 15;

  const overall = clampScore(
    readability * 0.2 +
      seo * 0.15 +
      completeness * 0.3 +
      (100 - spamRisk) * 0.15 +
      (100 - hallucinationRisk) * 0.1 +
      (100 - duplicateRisk) * 0.1,
  );

  return {
    overall,
    readability,
    seo,
    completeness,
    spamRisk,
    hallucinationRisk,
    duplicateRisk,
    passed: overall >= QUALITY_THRESHOLD,
  };
}
