/** SEO package geo helpers — re-export GEO render hints for pages (full engine in @ai-tool-cms/geo). */
export type GeoSeoHints = {
  semanticKeywords?: string[];
  citationReadySummary?: string;
};

export function buildGeoSeoHints(geo?: {
  llmSummary?: string;
  semanticParagraphs?: string[];
}): GeoSeoHints {
  return {
    citationReadySummary: geo?.llmSummary,
    semanticKeywords: geo?.semanticParagraphs?.slice(0, 5),
  };
}
