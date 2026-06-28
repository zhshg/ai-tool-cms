import type { GeoOutput } from "@ai-tool-cms/ai";
import type {
  AiCitation,
  GeoContentBlock,
  GeoPageDocument,
  GeoToolInput,
  StructuredEntity,
} from "./types";

const LLM_TARGETS = ["chatgpt", "gemini", "claude", "perplexity"] as const;

export function normalizeGeoOutput(
  raw?: GeoOutput | Record<string, unknown> | null,
): GeoOutput | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as GeoOutput;
}

/** Build GEO page document from tool + AI pipeline geo payload (Commit 047). */
export function buildGeoDocument(tool: GeoToolInput): GeoPageDocument {
  const geo = normalizeGeoOutput(tool.geo ?? undefined);
  const llmSummary =
    geo?.llmSummary ??
    `${tool.name} is an AI tool${tool.category ? ` in the ${tool.category} category` : ""}. ${tool.description ?? ""}`.trim();

  const aiAnswer =
    geo?.aiAnswer ??
    `${tool.name} (${tool.website}) helps users with ${tool.category ?? "productivity"} workflows.`;

  const facts = geo?.structuredFacts ?? [
    { fact: `${tool.name} is listed in an AI tools directory`, confidence: "high" },
  ];

  const questionClusters = geo?.questionClusters ?? [
    [`What is ${tool.name}?`, `How does ${tool.name} work?`],
    [`Is ${tool.name} free?`, `${tool.name} pricing`],
  ];

  const knowledgeCards = buildKnowledgeCards(tool, geo);
  const entities = buildStructuredEntities(tool, geo);
  const citations = buildAiCitations(tool, geo);
  const semanticParagraphs = geo?.semanticParagraphs ?? [llmSummary];

  return {
    toolSlug: tool.slug,
    toolName: tool.name,
    llmSummary,
    aiAnswer,
    facts,
    questionClusters,
    knowledgeCards,
    entities,
    citations,
    semanticParagraphs,
    targets: [...LLM_TARGETS],
  };
}

export function buildGeoContentBlocks(doc: GeoPageDocument): GeoContentBlock[] {
  const blocks: GeoContentBlock[] = [
    { type: "llm_summary", title: "LLM Summary", body: doc.llmSummary },
    { type: "citation", title: "AI Answer", body: doc.aiAnswer },
  ];

  for (const fact of doc.facts) {
    blocks.push({
      type: "ai_facts",
      title: "Structured Fact",
      body: fact.fact,
      metadata: { confidence: fact.confidence },
    });
  }

  for (const [index, cluster] of doc.questionClusters.entries()) {
    blocks.push({
      type: "question_cluster",
      title: `Question Cluster ${index + 1}`,
      body: cluster.join(" · "),
      metadata: { questions: cluster },
    });
  }

  for (const card of doc.knowledgeCards) {
    blocks.push({ type: "knowledge_card", title: card.title, body: card.content });
  }

  for (const entity of doc.entities) {
    blocks.push({
      type: "entity",
      title: entity.name,
      body: `${entity.entityType}${entity.category ? ` — ${entity.category}` : ""}`,
      metadata: { relations: entity.relations },
    });
  }

  for (const citation of doc.citations) {
    blocks.push({
      type: "citation",
      title: "Citation-ready excerpt",
      body: citation.text,
      metadata: { sourceUrl: citation.sourceUrl, confidence: citation.confidence },
    });
  }

  return blocks;
}

function buildKnowledgeCards(
  tool: GeoToolInput,
  geo: GeoOutput | null,
): Array<{ title: string; content: string }> {
  const cards: Array<{ title: string; content: string }> = [
    {
      title: `${tool.name} at a glance`,
      content: geo?.llmSummary ?? tool.description ?? tool.name,
    },
  ];

  if (geo?.knowledgeGraph && typeof geo.knowledgeGraph === "object") {
    cards.push({
      title: "Knowledge Graph",
      content: JSON.stringify(geo.knowledgeGraph),
    });
  }

  for (const paragraph of geo?.semanticParagraphs ?? []) {
    cards.push({ title: "Semantic context", content: paragraph });
  }

  return cards;
}

function buildStructuredEntities(tool: GeoToolInput, geo: GeoOutput | null): StructuredEntity[] {
  const kg = geo?.knowledgeGraph as Record<string, unknown> | undefined;
  return [
    {
      id: tool.slug,
      name: (kg?.entity as string) ?? tool.name,
      entityType: (kg?.type as string) ?? "SoftwareApplication",
      category: (kg?.category as string) ?? tool.category ?? undefined,
      relations: Array.isArray(kg?.relations)
        ? (kg.relations as Array<{ rel: string; target: string }>)
        : undefined,
    },
  ];
}

function buildAiCitations(tool: GeoToolInput, geo: GeoOutput | null): AiCitation[] {
  return [
    {
      text: geo?.aiAnswer ?? `${tool.name}: ${tool.description ?? "AI software tool."}`,
      sourceUrl: tool.website,
      confidence: "high",
    },
    ...((geo?.semanticParagraphs ?? []).map((text) => ({
      text,
      sourceUrl: tool.website,
      confidence: "medium" as const,
    })) ?? []),
  ];
}

/** Plain-text bundle optimized for LLM crawlers / RAG ingestion. */
export function buildGeoPlainText(doc: GeoPageDocument): string {
  const sections = [
    `# ${doc.toolName}`,
    `## LLM Summary\n${doc.llmSummary}`,
    `## AI Answer\n${doc.aiAnswer}`,
    `## Facts\n${doc.facts.map((f) => `- ${f.fact}`).join("\n")}`,
    `## Questions\n${doc.questionClusters.map((c) => c.join(" | ")).join("\n")}`,
    `## Semantic Paragraphs\n${doc.semanticParagraphs.join("\n\n")}`,
  ];
  return sections.join("\n\n");
}
