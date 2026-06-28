export type EmbeddingProviderId = "openai" | "gemini" | "voyage" | "jina" | "bge" | "mock";

export type EmbeddingInput = {
  text: string;
  model?: string;
};

export type EmbeddingResult = {
  vector: number[];
  provider: EmbeddingProviderId;
  model: string;
  dimensions: number;
};

export type EmbeddingProvider = {
  id: EmbeddingProviderId;
  embed(input: EmbeddingInput): Promise<EmbeddingResult>;
};
