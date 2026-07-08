import { STANDARD_AI_CATEGORIES, resolveCanonicalCategorySlug, slugify } from "@ai-tool-cms/common";
import { PricingModel } from "@ai-tool-cms/database";

const PLACEHOLDER_PATTERNS = [
  /example\.com/i,
  /placeholder/i,
  /demo data/i,
  /bulk seeded/i,
  /seeded tool/i,
  /mock data/i,
  /test data/i,
] as const;

const CATEGORY_RULES: Array<{ category: string; pattern: RegExp }> = [
  {
    category: "AI Writing",
    pattern: /\b(write|writer|copy|content|grammar|translation|blog|email|inbox)\b/i,
  },
  {
    category: "AI Image",
    pattern:
      /\b(image|photo|art|avatar|diffusion|illustration|artistry|midjourney|dating photos|selfies)\b/i,
  },
  { category: "AI Video", pattern: /\b(video|motion|clip|movie|animation|3d motion)\b/i },
  { category: "AI Audio", pattern: /\b(audio|voice|speech|music|podcast|sound)\b/i },
  {
    category: "AI Coding",
    pattern: /\b(code|coding|copilot|programming|developer|webgpu|repository|open source)\b/i,
  },
  {
    category: "AI Productivity",
    pattern:
      /\b(productivity|notes|meeting|workspace|assistant|organize|workflow|team email|resume|app builder|custom apps)\b/i,
  },
  {
    category: "AI Education",
    pattern: /\b(worksheet|worksheets|lesson|study|learning|curriculum|tutor|classroom|student)\b/i,
  },
  {
    category: "AI Marketing",
    pattern:
      /\b(marketing|campaign|brand|copywriting|ecommerce|landing page|ugc|lead qualification|conversion)\b/i,
  },
  {
    category: "AI SEO",
    pattern:
      /\b(seo|search ranking|keyword|backlink|answer engine optimization|aeo|visibility|discoverability|brand exists|business exists|reddit trends)\b/i,
  },
  {
    category: "AI Business",
    pattern:
      /\b(crm|sales|finance|customer|operations|law firm|legal|city guide|business team|quotes|market alerts|call management)\b/i,
  },
  {
    category: "AI Research",
    pattern:
      /\b(research|analysis|citation|citations|paper|search|summarize|model|visualization|visualize|benchmark|eval|ocr|documents|document analysis|insights from documents)\b/i,
  },
  {
    category: "AI Chatbots",
    pattern: /\b(chat|chatbot|assistant|chatgpt|conversational|imessage)\b/i,
  },
  { category: "AI Agents", pattern: /\b(agent|agents|autonomous|multi-step)\b/i },
  {
    category: "AI Design",
    pattern:
      /\b(ui|ux|prototype|figma|creative|design|3d model|3d models|interior|player card|mockup)\b/i,
  },
  { category: "AI Automation", pattern: /\b(automation|workflow|zapier|make|n8n)\b/i },
  {
    category: "AI Developer Tools",
    pattern:
      /\b(api|sdk|terminal|cli|devops|repository|schema validation|typescript|data stack|git command|development workflows)\b/i,
  },
  {
    category: "AI Data",
    pattern:
      /\b(data extraction|dataset|analytics|spreadsheet|structured data|web scraping|excel formulas|formula bot)\b/i,
  },
  {
    category: "AI Presentation",
    pattern: /\b(slide deck|slide decks|presentation|presentations|pitch deck)\b/i,
  },
  {
    category: "AI Social Media",
    pattern: /\b(social media|reddit|followers|engagement|creator posts|social growth)\b/i,
  },
  {
    category: "AI Customer Support",
    pattern: /\b(customer support|support inbox|ticketing|help desk|knowledge base)\b/i,
  },
];

const STANDARD_CATEGORY_NAME_BY_SLUG = new Map(
  STANDARD_AI_CATEGORIES.map((category) => [category.slug, category.name]),
);

export function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!url.hostname) return false;
    if (/localhost|127\.0\.0\.1/i.test(url.hostname)) return false;
    if (value.startsWith("/")) return false;
    if (/\/uploads\//i.test(value)) return false;
    return true;
  } catch {
    return false;
  }
}

export function getHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getRegistrableDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const hostname = getHostname(value);
  if (!hostname) return null;
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

export function buildGoogleFavicon(websiteUrl: string | null): string | null {
  if (!websiteUrl || !isHttpsUrl(websiteUrl)) return null;
  const hostname = getHostname(websiteUrl);
  if (!hostname) return null;
  return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
}

export function normalizeLogoUrl(
  logoUrl: string | null | undefined,
  websiteUrl: string | null,
): string | null {
  const cleaned = cleanText(logoUrl);
  if (cleaned && isHttpsUrl(cleaned)) return cleaned;
  return buildGoogleFavicon(websiteUrl);
}

export function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  if (!cleaned || !isHttpsUrl(cleaned)) return null;
  try {
    const url = new URL(cleaned);
    const removableKeys = [...url.searchParams.keys()].filter((key) => {
      const normalized = key.toLowerCase();
      return (
        normalized.startsWith("utm_") ||
        normalized === "ref" ||
        normalized === "source" ||
        normalized === "campaign" ||
        normalized === "medium" ||
        normalized === "via" ||
        normalized === "fpr"
      );
    });
    for (const key of removableKeys) {
      url.searchParams.delete(key);
    }
    return url.toString().replace(/\?$/, "");
  } catch {
    return cleaned;
  }
}

export function normalizeShortDescription(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  if (!cleaned || cleaned.length < 24) return null;
  return cleaned.slice(0, 220);
}

export function normalizeLongDescription(
  value: string | null | undefined,
  fallbackName: string,
  fallbackSourceName: string,
): string {
  const cleaned = cleanText(value);
  if (cleaned && cleaned.length >= 40) return cleaned;
  return `${fallbackName} is an AI tool discovered by the ${fallbackSourceName} auto-update pipeline and prepared for editorial review on toolsdar.io.`;
}

export function mapPricingType(value: string | null | undefined): PricingModel {
  const cleaned = cleanText(value)?.toLowerCase() ?? "";
  if (!cleaned) return PricingModel.FREE;
  if (/(freemium|free tier|trial)/i.test(cleaned)) return PricingModel.FREEMIUM;
  if (/(paid|subscription|pro|premium)/i.test(cleaned)) return PricingModel.PAID;
  if (/(enterprise|contact|quote|custom)/i.test(cleaned)) return PricingModel.CONTACT;
  return PricingModel.FREE;
}

export function detectCategory(text: string): string | null {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return null;
}

export function canonicalizeCategoryName(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const slug = resolveCanonicalCategorySlug(cleaned);
  if (!slug) return null;
  return (STANDARD_CATEGORY_NAME_BY_SLUG.get(slug) as string | undefined) ?? null;
}

export function buildSlug(name: string, websiteUrl: string | null): string {
  const base = slugify(name);
  if (base) return base;
  const domain = websiteUrl ? getRegistrableDomain(websiteUrl) : null;
  return slugify(domain ?? "ai-tool");
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => cleanText(tag)?.toLowerCase() ?? "").filter(Boolean))].slice(
    0,
    8,
  );
}

export function looksPlaceholder(...values: Array<string | null | undefined>): boolean {
  const text = values.filter(Boolean).join(" ");
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function scoreConfidence(input: {
  base: number;
  websiteUrl: string | null;
  logoUrl: string | null;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  placeholder: boolean;
}): number {
  let score = input.base;
  if (input.websiteUrl) score += 0.18;
  if (input.logoUrl) score += 0.12;
  if (input.shortDescription) score += 0.12;
  if (input.description) score += 0.08;
  if (input.category) score += 0.1;
  if (input.placeholder) score -= 0.5;
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export function similarity(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 1;
  const leftTokens = new Set(left.split(/[^a-z0-9]+/i).filter(Boolean));
  const rightTokens = new Set(right.split(/[^a-z0-9]+/i).filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;
  let common = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) common += 1;
  }
  return common / Math.max(leftTokens.size, rightTokens.size);
}
