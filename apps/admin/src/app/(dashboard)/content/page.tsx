"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  GitMerge,
  ImageOff,
  Link2Off,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  bulkImproveContent,
  fetchContentDataset,
  fetchContentQuality,
  getApiErrorMessage,
  mergeDuplicateTools,
  type ApiError,
  type ContentDatasetResponse,
  type ContentIssueReport,
  type ContentIssueTool,
  type ContentQualityItem,
  type ContentQualityResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

const missingSections: Array<{ key: string; title: string; description: string }> = [
  {
    key: "missingLogo",
    title: "Missing Logo",
    description: "Tools without stored, collected, or metadata logos.",
  },
  {
    key: "missingDescription",
    title: "Missing Description",
    description: "Tools missing short or full descriptions.",
  },
  {
    key: "missingFeatures",
    title: "Missing Features",
    description: "Tools without structured feature lists.",
  },
  { key: "missingFaq", title: "Missing FAQ", description: "Tools without FAQ content." },
  {
    key: "missingCategories",
    title: "Missing Categories",
    description: "Tools without a primary category or any category coverage.",
  },
  {
    key: "missingTags",
    title: "Missing Tags",
    description: "Tools without tag coverage for search and discovery.",
  },
  {
    key: "missingPricing",
    title: "Missing Pricing",
    description: "Tools without pricing model or pricing plan details.",
  },
  {
    key: "missingUseCases",
    title: "Missing Use Cases",
    description: "Tools without use-case examples or scenario coverage.",
  },
  {
    key: "missingAlternatives",
    title: "Missing Alternatives",
    description: "Tools without alternative suggestions or comparison context.",
  },
];

export default function ContentDatasetPage() {
  const [data, setData] = useState<ContentDatasetResponse | null>(null);
  const [quality, setQuality] = useState<ContentQualityResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [mergeKey, setMergeKey] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  async function loadDataset() {
    setIsLoading(true);
    try {
      const [response, qualityResponse] = await Promise.all([
        fetchContentDataset(),
        fetchContentQuality(),
      ]);
      setData(response);
      setQuality(qualityResponse);
      setError(null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDataset();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = data?.summary;
    const issues = data?.issues;
    const relatedGaps = data?.missing
      ? [
          data.missing.missingCategories?.total ?? 0,
          data.missing.missingTags?.total ?? 0,
          data.missing.missingPricing?.total ?? 0,
          data.missing.missingUseCases?.total ?? 0,
          data.missing.missingAlternatives?.total ?? 0,
        ].reduce((sum, value) => sum + value, 0)
      : 0;
    return [
      { label: "Total Tools", value: summary?.totalTools ?? 0, icon: Database },
      { label: "Published", value: summary?.publishedTools ?? 0, icon: CheckCircle2 },
      {
        label: "Average Score",
        value: `${summary?.averageContentScore ?? 0}%`,
        icon: CheckCircle2,
      },
      { label: "Related Gaps", value: relatedGaps, icon: Activity },
      { label: "Duplicate Groups", value: issues?.duplicateGroups ?? 0, icon: GitMerge },
      { label: "Missing Logos", value: issues?.missingLogo ?? 0, icon: ImageOff },
      { label: "Broken Links", value: issues?.brokenWebsites ?? 0, icon: Link2Off },
    ];
  }, [data]);

  async function handleBulkImprove(toolIds?: string[]) {
    const confirmed = window.confirm(
      toolIds?.length
        ? "Queue AI improvement for the selected low-quality tools?"
        : "Queue AI improvement for the top low-quality tools?",
    );
    if (!confirmed) return;

    setIsImproving(true);
    setError(null);
    try {
      const result = await bulkImproveContent(toolIds);
      setMessage(`AI content improvement queued for ${result.queued} tool(s).`);
      await loadDataset();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsImproving(false);
    }
  }

  async function handleMerge(sourceToolId: string, targetToolId: string) {
    const confirmed = window.confirm(
      "Merge this duplicate into the selected canonical tool? The source tool will be archived.",
    );
    if (!confirmed) return;

    const key = `${sourceToolId}:${targetToolId}`;
    setMergeKey(key);
    setError(null);
    try {
      await mergeDuplicateTools(sourceToolId, targetToolId);
      setMessage("Duplicate merged and source tool archived.");
      await loadDataset();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setMergeKey(null);
    }
  }

  return (
    <RequirePermission permission={Permission.ToolsRead}>
      <div className="space-y-6">
        <PageHeader
          title="Content Dataset"
          description="Production dataset manager for AI tool coverage, quality, duplicates, and broken websites."
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium">Production content expansion</p>
            <p className="text-sm text-muted-foreground">
              Targets: {data?.targets.initial ?? 500}+ initial, {data?.targets.ready ?? 2000}+
              ready, scalable to {data?.targets.scale ?? 10000}+ tools.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            onClick={() => void loadDataset()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            API error {error.status}: {getApiErrorMessage(error)}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading content dataset...</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              </div>
            );
          })}
        </div>

        {data ? (
          <>
            {quality ? (
              <section className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Content Quality Engine</h2>
                    <p className="text-sm text-muted-foreground">
                      AI-assisted scoring for content, SEO, completeness, readability, and launch
                      gaps.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    disabled={isImproving}
                    onClick={() => void handleBulkImprove()}
                  >
                    <Activity className="h-4 w-4" />
                    {isImproving ? "Queueing..." : "Bulk Improve"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <QualityStat
                    label="Content Score"
                    value={`${quality.summary.averageContentScore}%`}
                  />
                  <QualityStat label="SEO Score" value={`${quality.summary.averageSeoScore}%`} />
                  <QualityStat
                    label="Completeness"
                    value={`${quality.summary.averageCompletenessScore}%`}
                  />
                  <QualityStat
                    label="Readability"
                    value={`${quality.summary.averageReadability}%`}
                  />
                  <QualityStat label="Excellent" value={quality.summary.excellentTools} />
                  <QualityStat label="Needs Work" value={quality.summary.needsImprovement} />
                </div>
                <div className="mt-5 grid gap-6 xl:grid-cols-2">
                  <QualityList
                    title="Top Missing Content"
                    description="Lowest-scoring tools with actionable missing content."
                    items={quality.topMissingContent}
                    actionLabel="Improve"
                    onAction={(tool) => void handleBulkImprove([tool.id])}
                    isActionDisabled={isImproving}
                  />
                  <QualityList
                    title="Quality Ranking"
                    description="Tools ranked from weakest to strongest launch quality."
                    items={quality.qualityRanking}
                  />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(quality.metrics).map(([key, metric]) => (
                    <div key={key} className="rounded-md border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{key}</span>
                        <span className="font-medium">{metric.averageScore}%</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {metric.passing} passing / {metric.failing} failing
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Coverage</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(data.coverage).map(([key, value]) => (
                  <div key={key} className="rounded-md border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{key}</span>
                      <span className="font-medium">{value.percent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${value.percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {value.covered} covered / {value.missing} missing
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              {missingSections.map((section) => (
                <IssuePanel
                  key={section.key}
                  title={section.title}
                  description={section.description}
                  suggestion={buildIssueSuggestion(section.key, data.missing[section.key])}
                  report={data.missing[section.key]}
                  actionLabel="Review"
                  onBulkOpen={openTopFiveInNewTabs}
                />
              ))}
            </div>

            <IssuePanel
              title="Broken Links"
              description={data.brokenWebsites.note}
              suggestion={buildIssueSuggestion("brokenWebsites", data.brokenWebsites)}
              report={data.brokenWebsites}
              actionLabel="Fix"
              onBulkOpen={openTopFiveInNewTabs}
            />

            {quality ? (
              <section className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Related Content Map</h2>
                    <p className="text-sm text-muted-foreground">
                      Use these lists to cross-fill descriptions, FAQs, tags, and positioning.
                    </p>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium">
                    Cross补全
                  </span>
                </div>

                <div className="mt-5 grid gap-6 xl:grid-cols-3">
                  <ToolSuggestionPanel
                    title="Related Tools"
                    description="High-quality tools you can reference for structure and tone."
                    items={quality.bestQuality.slice(0, 6)}
                    emptyText="No related tools available."
                  />
                  <ToolSuggestionPanel
                    title="Similar Tools"
                    description="Tools with similar content gaps and improvement needs."
                    items={quality.topMissingContent.slice(0, 6)}
                    emptyText="No similar tools available."
                  />
                  <ToolSuggestionPanel
                    title="Alternatives"
                    description="Canonical tools from duplicate groups for comparison and dedupe."
                    items={data.duplicates.groups.map((group) => group.tools[0]).slice(0, 6)}
                    emptyText="No alternatives available."
                  />
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Duplicate Detection</h2>
                  <p className="text-sm text-muted-foreground">
                    {data.duplicates.totalGroups} groups / {data.duplicates.totalTools} tools
                    detected by normalized website, slug, or name.
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-4">
                {data.duplicates.groups.length ? (
                  data.duplicates.groups.map((group) => {
                    const canonical = group.tools[0];
                    return (
                      <div key={`${group.reason}-${group.key}`} className="rounded-md border p-4">
                        <p className="text-sm font-medium">
                          {group.reason}: {group.key}
                        </p>
                        <div className="mt-3 divide-y rounded-md border">
                          {group.tools.map((tool) => (
                            <div
                              key={tool.id}
                              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="font-medium">{tool.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {tool.website}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/tools/${tool.id}/edit`}
                                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                                >
                                  Edit
                                </Link>
                                {tool.id !== canonical.id ? (
                                  <button
                                    type="button"
                                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                                    disabled={mergeKey === `${tool.id}:${canonical.id}`}
                                    onClick={() => void handleMerge(tool.id, canonical.id)}
                                  >
                                    {mergeKey === `${tool.id}:${canonical.id}`
                                      ? "Merging..."
                                      : `Merge into ${canonical.name}`}
                                  </button>
                                ) : (
                                  <span className="rounded-md bg-muted px-3 py-1.5 text-xs">
                                    Canonical
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No duplicate groups detected.</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}

function IssuePanel({
  title,
  description,
  suggestion,
  report,
  actionLabel,
  onBulkOpen,
}: {
  title: string;
  description: string;
  suggestion: string;
  report?: ContentIssueReport;
  actionLabel?: string;
  onBulkOpen?: (items: ContentIssueTool[]) => void;
}) {
  const handleCopySuggestion = async () => {
    try {
      await navigator.clipboard.writeText(suggestion);
    } catch {
      window.prompt("Copy suggestion", suggestion);
    }
  };

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {report?.items.length && onBulkOpen ? (
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
              onClick={() => onBulkOpen(report.items.slice(0, 5))}
            >
              Open top 5
            </button>
          ) : null}
          <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium">
            {report?.total ?? 0}
          </span>
        </div>
      </div>
      <div className="mt-4 rounded-md border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Auto suggestion</p>
            <p className="mt-1 text-sm leading-6">{suggestion}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
            onClick={() => void handleCopySuggestion()}
          >
            Copy
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {report?.items.length ? (
          report.items.map((tool) => (
            <div
              key={`${title}-${tool.id}`}
              className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{tool.name}</p>
                <p className="truncate text-xs text-muted-foreground">{tool.reason}</p>
              </div>
              <Link
                href={`/tools/${tool.id}/edit`}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              >
                {actionLabel ?? "Fix"}
              </Link>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No issues found.</p>
        )}
      </div>
    </section>
  );
}

function openTopFiveInNewTabs(items: ContentIssueTool[]) {
  for (const tool of items) {
    window.open(`/tools/${tool.id}/edit`, "_blank", "noopener,noreferrer");
  }
}

function buildIssueSuggestion(key: string, report?: ContentIssueReport) {
  const count = report?.total ?? 0;
  const firstTool = report?.items[0]?.name ?? "this tool";
  const sampleNames =
    report?.items
      .slice(0, 3)
      .map((item) => item.name)
      .filter(Boolean) ?? [];
  const sampleText = sampleNames.length ? `例如 ${sampleNames.join("、")}。` : "";

  switch (key) {
    case "missingLogo":
      return `优先为前 ${Math.min(count, 5)} 个缺 logo 工具补上品牌 logo、收藏图和 fallback logo。${sampleText}`;
    case "missingDescription":
      return `为前 ${Math.min(count, 5)} 个工具补充 1 句摘要 + 1 段 80-150 字的功能描述，突出核心场景和结果。${sampleText}`;
    case "missingFeatures":
      return `给前 ${Math.min(count, 5)} 个工具补 3-5 条结构化功能点，尽量用动词开头，覆盖功能、收益、限制。${sampleText}`;
    case "missingFaq":
      return `为前 ${Math.min(count, 5)} 个工具补 3-5 个 FAQ，优先回答价格、使用方式、适用人群和替代方案。${sampleText}`;
    case "missingCategories":
      return `先给前 ${Math.min(count, 5)} 个工具补主分类，再按内容补 1-2 个副分类，避免继续落到 Uncategorized。${sampleText}`;
    case "missingTags":
      return `为前 ${Math.min(count, 5)} 个工具补 3-5 个标签，优先覆盖行业、场景、功能和平台。${sampleText}`;
    case "missingPricing":
      return `为前 ${Math.min(count, 5)} 个工具补价格模型与计划信息，至少明确 Free / Freemium / Paid / Contact。${sampleText}`;
    case "missingUseCases":
      return `为前 ${Math.min(count, 5)} 个工具补真实使用场景，尽量写成“谁在什么情况下用它”。${sampleText}`;
    case "missingAlternatives":
      return `为前 ${Math.min(count, 5)} 个工具补 2-3 个替代项，最好同时覆盖同类工具和长尾工具。${sampleText}`;
    case "brokenWebsites":
      return `优先检查前 ${Math.min(count, 5)} 个失效链接，先确认 ${firstTool} 的网址是否跳转、404 或被重定向到错误站点。${sampleText}`;
    default:
      return `优先处理前 ${Math.min(count, 5)} 个工具，补齐缺失内容并重新检查相关字段。${sampleText}`;
  }
}

function ToolSuggestionPanel({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description: string;
  items: Array<{
    id: string;
    name: string;
    slug: string;
    website: string;
    updatedAt: string;
    recommendedAction?: string;
    contentScore?: number;
    reason?: string;
  }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{items.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((tool) => (
            <div key={`${title}-${tool.id}`} className="rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{tool.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tool.reason ?? tool.recommendedAction ?? tool.slug}
                  </p>
                </div>
                <Link
                  href={`/tools/${tool.id}/edit`}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Open
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-1">Slug: {tool.slug}</span>
                {typeof tool.contentScore === "number" ? (
                  <span className="rounded-full bg-muted px-2 py-1">
                    Score: {tool.contentScore}%
                  </span>
                ) : null}
                <span className="rounded-full bg-muted px-2 py-1">
                  Updated: {new Date(tool.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function QualityStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function QualityList({
  title,
  description,
  items,
  actionLabel,
  onAction,
  isActionDisabled = false,
}: {
  title: string;
  description: string;
  items: ContentQualityItem[];
  actionLabel?: string;
  onAction?: (tool: ContentQualityItem) => void;
  isActionDisabled?: boolean;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{items.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.slice(0, 8).map((tool) => (
            <div key={`${title}-${tool.id}`} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{tool.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tool.recommendedAction}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    {tool.contentScore}%
                  </span>
                  {onAction && actionLabel ? (
                    <button
                      type="button"
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60"
                      disabled={isActionDisabled}
                      onClick={() => onAction(tool)}
                    >
                      {actionLabel}
                    </button>
                  ) : null}
                  <Link
                    href={`/tools/${tool.id}/edit`}
                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Edit
                  </Link>
                </div>
              </div>
              {tool.missing.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tool.missing.slice(0, 4).map((item) => (
                    <span
                      key={`${tool.id}-${item.key}`}
                      className="rounded-full bg-muted px-2 py-1 text-xs"
                    >
                      {item.label}: {item.score}%
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tools to show.</p>
        )}
      </div>
    </div>
  );
}
