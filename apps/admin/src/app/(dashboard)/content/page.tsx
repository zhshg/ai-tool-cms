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
    return [
      { label: "Total Tools", value: summary?.totalTools ?? 0, icon: Database },
      { label: "Published", value: summary?.publishedTools ?? 0, icon: CheckCircle2 },
      {
        label: "Average Score",
        value: `${summary?.averageContentScore ?? 0}%`,
        icon: CheckCircle2,
      },
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                  report={data.missing[section.key]}
                />
              ))}
            </div>

            <IssuePanel
              title="Broken Links"
              description={data.brokenWebsites.note}
              report={data.brokenWebsites}
            />

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
  report,
}: {
  title: string;
  description: string;
  report?: ContentIssueReport;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium">
          {report?.total ?? 0}
        </span>
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
                Fix
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
