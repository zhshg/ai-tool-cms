import { createHash } from "node:crypto";
import { getEnv } from "@ai-tool-cms/config";
import type {
  EmbeddingInput,
  EmbeddingProvider,
  EmbeddingProviderId,
  EmbeddingResult,
} from "./types";

const MOCK_DIMENSIONS = 384;

/** Deterministic mock embedding for dev/test without API keys. */
function mockEmbed(text: string, dimensions = MOCK_DIMENSIONS): number[] {
  const hash = createHash("sha256").update(text).digest();
  const vector: number[] = [];
  for (let i = 0; i < dimensions; i += 1) {
    const byte = hash[i % hash.length]!;
    vector.push((byte / 255) * 2 - 1);
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function openAiEmbed(input: EmbeddingInput): Promise<EmbeddingResult> {
  const env = getEnv();
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const model = input.model ?? env.EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await fetch(`${env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: input.text }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  const vector = data.data[0]?.embedding ?? [];
  return { vector, provider: "openai", model, dimensions: vector.length };
}

async function geminiEmbed(input: EmbeddingInput): Promise<EmbeddingResult> {
  const env = getEnv();
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = input.model ?? "text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: input.text }] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as { embedding?: { values?: number[] } };
  const vector = data.embedding?.values ?? [];
  return { vector, provider: "gemini", model, dimensions: vector.length };
}

async function voyageEmbed(input: EmbeddingInput): Promise<EmbeddingResult> {
  const env = getEnv();
  const apiKey = env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY not configured");

  const model = input.model ?? "voyage-3-lite";
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: [input.text] }),
  });

  if (!response.ok) {
    throw new Error(`VoyageAI embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  const vector = data.data[0]?.embedding ?? [];
  return { vector, provider: "voyage", model, dimensions: vector.length };
}

async function jinaEmbed(input: EmbeddingInput): Promise<EmbeddingResult> {
  const env = getEnv();
  const apiKey = env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY not configured");

  const model = input.model ?? "jina-embeddings-v3";
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: [input.text] }),
  });

  if (!response.ok) {
    throw new Error(`Jina embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  const vector = data.data[0]?.embedding ?? [];
  return { vector, provider: "jina", model, dimensions: vector.length };
}

async function bgeEmbed(input: EmbeddingInput): Promise<EmbeddingResult> {
  const env = getEnv();
  const baseUrl = env.BGE_EMBEDDING_URL;
  if (!baseUrl) throw new Error("BGE_EMBEDDING_URL not configured");

  const model = input.model ?? "bge-small-en-v1.5";
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: input.text }),
  });

  if (!response.ok) {
    throw new Error(`BGE embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    embedding?: number[];
    data?: Array<{ embedding: number[] }>;
  };
  const vector = data.embedding ?? data.data?.[0]?.embedding ?? [];
  return { vector, provider: "bge", model, dimensions: vector.length };
}

const providers: Record<EmbeddingProviderId, EmbeddingProvider> = {
  mock: {
    id: "mock",
    async embed(input) {
      const vector = mockEmbed(input.text);
      return { vector, provider: "mock", model: "mock-hash-384", dimensions: vector.length };
    },
  },
  openai: { id: "openai", embed: openAiEmbed },
  gemini: { id: "gemini", embed: geminiEmbed },
  voyage: { id: "voyage", embed: voyageEmbed },
  jina: { id: "jina", embed: jinaEmbed },
  bge: { id: "bge", embed: bgeEmbed },
};

export function resolveEmbeddingProvider(): EmbeddingProviderId {
  const env = getEnv();
  const preferred = (env.EMBEDDING_PROVIDER ?? "mock") as EmbeddingProviderId;
  if (preferred === "openai" && env.OPENAI_API_KEY) return "openai";
  if (preferred === "gemini" && env.GEMINI_API_KEY) return "gemini";
  if (preferred === "voyage" && env.VOYAGE_API_KEY) return "voyage";
  if (preferred === "jina" && env.JINA_API_KEY) return "jina";
  if (preferred === "bge" && env.BGE_EMBEDDING_URL) return "bge";
  if (preferred !== "mock") {
    if (env.OPENAI_API_KEY) return "openai";
    if (env.GEMINI_API_KEY) return "gemini";
    if (env.VOYAGE_API_KEY) return "voyage";
    if (env.JINA_API_KEY) return "jina";
    if (env.BGE_EMBEDDING_URL) return "bge";
  }
  return "mock";
}

export function getEmbeddingProvider(id?: EmbeddingProviderId): EmbeddingProvider {
  const resolved = id ?? resolveEmbeddingProvider();
  return providers[resolved];
}

export async function embedText(
  text: string,
  providerId?: EmbeddingProviderId,
): Promise<EmbeddingResult> {
  const provider = getEmbeddingProvider(providerId);
  return provider.embed({ text });
}
