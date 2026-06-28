/** Intent-aware synonym expansion (Commit 053). */
const SYNONYM_GROUPS: string[][] = [
  [
    "ai ppt",
    "presentation",
    "slides",
    "powerpoint",
    "deck",
    "slide deck",
    "gamma",
    "beautiful.ai",
    "slidesai",
    "tome",
    "pitch",
  ],
  ["chatbot", "chat bot", "conversational ai", "assistant"],
  ["code assistant", "copilot", "coding ai", "ide assistant"],
  ["image generator", "text to image", "ai art", "midjourney", "flux"],
  ["video generator", "text to video", "ai video", "runway", "pika"],
  ["writing", "copywriting", "content writer", "ai writing"],
  ["search", "research", "perplexity", "answer engine"],
];

const synonymIndex = new Map<string, Set<string>>();

for (const group of SYNONYM_GROUPS) {
  const normalized = group.map((t) => normalizeTerm(t));
  for (const term of normalized) {
    const existing = synonymIndex.get(term) ?? new Set<string>();
    for (const alt of normalized) {
      if (alt !== term) existing.add(alt);
    }
    synonymIndex.set(term, existing);
  }
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function expandQuerySynonyms(query: string): string {
  const normalized = normalizeTerm(query);
  if (!normalized) return query;

  const terms = new Set<string>([normalized]);
  const direct = synonymIndex.get(normalized);
  if (direct) {
    for (const alt of direct) terms.add(alt);
  }

  for (const [key, alts] of synonymIndex.entries()) {
    if (normalized.includes(key)) {
      terms.add(key);
      for (const alt of alts) terms.add(alt);
    }
  }

  return [...terms].join(" ");
}

export function getSynonymTerms(query: string): string[] {
  const expanded = expandQuerySynonyms(query);
  return expanded.split(/\s+/).filter(Boolean);
}
