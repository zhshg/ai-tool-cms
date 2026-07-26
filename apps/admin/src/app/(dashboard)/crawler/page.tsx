"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Database,
  FileText,
  Layers3,
  PlusCircle,
  RefreshCw,
  Settings2,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/rbac/auth-provider";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  bulkPublishTools,
  createCrawlFieldDefine,
  createCrawlRule,
  createCrawlSource,
  deleteCrawlRule,
  fetchCrawlSources,
  fetchCrawlerArtifact,
  fetchCrawlerArtifacts,
  fetchCrawlerDashboard,
  fetchCrawlerDraftTools,
  fetchCrawlerSourceGraph,
  fetchRecentCrawlJobs,
  runCrawlRule,
  runCrawlerFlow,
  setCrawlSourceStatus,
  testCrawlerStep,
  triggerCrawlerJob,
  updateCrawlFieldDefine,
  updateCrawlRule,
  updateCrawlSource,
  type ApiError,
  type CrawlDraftTool,
  type CrawlArtifactDetail,
  type CrawlArtifactItem,
  type CrawlFieldDefine,
  type CrawlJob,
  type CrawlRecord,
  type CrawlRule,
  type CrawlSource,
  type CrawlerDashboard,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

const metricConfig = [
  { key: "todayCrawl", label: "Today crawl", icon: Activity },
  { key: "success", label: "Succeeded", icon: Workflow },
  { key: "failed", label: "Failed", icon: Database },
  { key: "pending", label: "Pending", icon: Layers3 },
  { key: "queueTotal", label: "Queue jobs", icon: Settings2 },
  { key: "averageTimeMs", label: "Average time ms", icon: RefreshCw },
  { key: "totalRules", label: "Rules", icon: BookOpen },
  { key: "totalRecords", label: "Records", icon: FileText },
] as const;

type SourceFormState = {
  name: string;
  slug: string;
  kind: string;
  baseUrl: string;
  adapterType: string;
  status: "ENABLED" | "DISABLED" | "PAUSED";
  schedule: string;
  crawlIntervalMinutes: string;
  robotsTxt: string;
  priority: string;
  config: string;
  metadata: string;
};

type RuleFormState = {
  name: string;
  code: string;
  ruleType: string;
  priority: string;
  isEnabled: boolean;
  listConfig: string;
  detailConfig: string;
  parseConfig: string;
  requestConfig: string;
  metadata: string;
  importJson: string;
};

type FieldFormState = {
  fieldKey: string;
  label: string;
  fieldType: string;
  sourcePath: string;
  transform: string;
  defaultValue: string;
  isRequired: boolean;
  isArray: boolean;
  sortOrder: string;
  config: string;
  metadata: string;
};

type ImportedRuleBundle = {
  source?: { name?: string; slug?: string; adapterType?: string; baseUrl?: string };
  rules?: Array<Record<string, unknown>>;
  fieldDefines?: Array<Record<string, unknown>>;
};

type SourceGraph = CrawlSource & {
  rules: Array<CrawlRule & { fields?: CrawlFieldDefine[] }>;
  records: CrawlRecord[];
  _count: { rules: number; fieldDefines: number; records: number; jobs: number };
};

const emptySourceForm: SourceFormState = {
  name: "",
  slug: "",
  kind: "CUSTOM",
  baseUrl: "",
  adapterType: "",
  status: "ENABLED",
  schedule: "DAILY",
  crawlIntervalMinutes: "1440",
  robotsTxt: "",
  priority: "100",
  config: "{}",
  metadata: "{}",
};

const emptyRuleForm: RuleFormState = {
  name: "",
  code: "",
  ruleType: "LIST",
  priority: "100",
  isEnabled: true,
  listConfig: "{}",
  detailConfig: "{}",
  parseConfig: "{}",
  requestConfig: "{}",
  metadata: "{}",
  importJson: "",
};

const emptyFieldForm: FieldFormState = {
  fieldKey: "",
  label: "",
  fieldType: "TEXT",
  sourcePath: "",
  transform: "",
  defaultValue: "",
  isRequired: false,
  isArray: false,
  sortOrder: "0",
  config: "{}",
  metadata: "{}",
};

function resolveMetric(data: CrawlerDashboard | null, key: (typeof metricConfig)[number]["key"]) {
  if (!data) return 0;
  if (key === "queueTotal") return data.queue.total;
  return data[key];
}

function parseJsonInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function parseImportedRuleBundle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as ImportedRuleBundle;
}

function formatJsonInput(value: unknown) {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

function sourceFormFromSource(source?: CrawlSource | null): SourceFormState {
  if (!source) return emptySourceForm;
  return {
    name: source.name ?? "",
    slug: source.slug ?? "",
    kind: source.kind ?? "CUSTOM",
    baseUrl: source.baseUrl ?? "",
    adapterType: source.adapterType ?? "",
    status: (source.status as SourceFormState["status"]) ?? "ENABLED",
    schedule: source.schedule ?? "DAILY",
    crawlIntervalMinutes: String(source.crawlIntervalMinutes ?? 1440),
    robotsTxt: source.robotsTxt ?? "",
    priority: String(source.priority ?? 100),
    config: formatJsonInput(source.config ?? {}),
    metadata: formatJsonInput(source.metadata ?? {}),
  };
}

function ruleFormFromRule(rule?: CrawlRule | null): RuleFormState {
  if (!rule) return emptyRuleForm;
  return {
    name: rule.name ?? "",
    code: rule.code ?? "",
    ruleType: rule.ruleType ?? "LIST",
    priority: String(rule.priority ?? 100),
    isEnabled: Boolean(rule.isEnabled),
    listConfig: formatJsonInput(rule.listConfig ?? {}),
    detailConfig: formatJsonInput(rule.detailConfig ?? {}),
    parseConfig: formatJsonInput(rule.parseConfig ?? {}),
    requestConfig: formatJsonInput(rule.requestConfig ?? {}),
    metadata: formatJsonInput(rule.metadata ?? {}),
    importJson: "",
  };
}

function fieldFormFromField(field?: CrawlFieldDefine | null): FieldFormState {
  if (!field) return emptyFieldForm;
  return {
    fieldKey: field.fieldKey ?? "",
    label: field.label ?? "",
    fieldType: field.fieldType ?? "TEXT",
    sourcePath: field.sourcePath ?? "",
    transform: field.transform ?? "",
    defaultValue: field.defaultValue ?? "",
    isRequired: Boolean(field.isRequired),
    isArray: Boolean(field.isArray),
    sortOrder: String(field.sortOrder ?? 0),
    config: formatJsonInput(field.config ?? {}),
    metadata: formatJsonInput(field.metadata ?? {}),
  };
}

function formatJobLog(job: CrawlJob | null | undefined) {
  if (!job?.result || typeof job.result !== "object") return "No flow log yet.";
  const result = job.result as Record<string, unknown>;
  const steps = Array.isArray(result.steps) ? result.steps : [];
  return [
    `Job: ${job.id}`,
    `Status: ${job.status}`,
    `Found: ${String(result.listItemsCount ?? job.itemsFound ?? 0)}`,
    `Created: ${String(result.created ?? job.itemsCreated ?? 0)}`,
    `Updated: ${String(result.updated ?? job.itemsUpdated ?? 0)}`,
    `Duplicates: ${String(result.duplicates ?? 0)}`,
    `Skipped: ${String(result.skipped ?? 0)}`,
    "",
    "Steps:",
    ...steps.map((step, index) => `${index + 1}. ${JSON.stringify(step)}`),
  ].join("\n");
}

function parseError(error: unknown): string {
  if (!error || typeof error !== "object") return "Unknown error";
  const candidate = error as Partial<ApiError>;
  return candidate.message || "Request failed";
}

export default function CrawlerPage() {
  const { hasPermission } = useAuth();
  const [dashboard, setDashboard] = useState<CrawlerDashboard | null>(null);
  const [sources, setSources] = useState<CrawlSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceGraph, setSourceGraph] = useState<SourceGraph | null>(null);
  const [recentJobs, setRecentJobs] = useState<CrawlJob[]>([]);
  const [draftTools, setDraftTools] = useState<CrawlDraftTool[]>([]);
  const [artifacts, setArtifacts] = useState<CrawlArtifactItem[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<CrawlArtifactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commandOutput, setCommandOutput] = useState<string>("No process output yet.");
  const [isLoading, setIsLoading] = useState(true);
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<"source" | "rule" | "field" | null>(null);
  const [runRuleTarget, setRunRuleTarget] = useState<CrawlRule | null>(null);
  const [runLimit, setRunLimit] = useState("10");
  const [runDedupeExisting, setRunDedupeExisting] = useState(true);
  const [editingSource, setEditingSource] = useState<CrawlSource | null>(null);
  const [editingRule, setEditingRule] = useState<CrawlRule | null>(null);
  const [editingField, setEditingField] = useState<CrawlFieldDefine | null>(null);
  const [fieldRuleId, setFieldRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(emptySourceForm);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm);
  const [fieldForm, setFieldForm] = useState<FieldFormState>(emptyFieldForm);
  const [selectedDraftToolIds, setSelectedDraftToolIds] = useState<string[]>([]);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  const canRunCrawler = hasPermission(Permission.CrawlerRun);
  const canManageCrawler = hasPermission(Permission.CrawlerManage);

  const activeSource = useMemo(
    () => sourceGraph ?? sources.find((item) => item.id === selectedSourceId) ?? null,
    [sourceGraph, sources, selectedSourceId],
  );
  const activeSourceName = activeSource?.name ?? "";
  const selectedJob =
    recentJobs.find(
      (job) => job.sourceId === selectedSourceId && ["RUNNING", "PENDING"].includes(job.status),
    ) ??
    recentJobs.find((job) => job.sourceId === selectedSourceId) ??
    recentJobs[0] ??
    null;

  const loadSourceGraph = useCallback(async (sourceId: string) => {
    try {
      const graph = await fetchCrawlerSourceGraph(sourceId);
      setSourceGraph(graph);
    } catch {
      setSourceGraph(null);
    }
  }, []);

  const refreshPage = useCallback(
    async (options?: { silent?: boolean; keepSelection?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setIsLoading(true);
      setError(null);

      const [dashboardResult, sourceResult, jobsResult, draftResult, artifactResult] =
        await Promise.allSettled([
          fetchCrawlerDashboard(),
          fetchCrawlSources(),
          fetchRecentCrawlJobs(),
          fetchCrawlerDraftTools(20),
          fetchCrawlerArtifacts(undefined, 20),
        ]);

      if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
      if (sourceResult.status === "fulfilled") {
        setSources(sourceResult.value.items);
        if (!options?.keepSelection) {
          setSelectedSourceId((current) => {
            if (current && sourceResult.value.items.some((item) => item.id === current)) {
              return current;
            }
            return sourceResult.value.items[0]?.id ?? null;
          });
        }
      }
      if (jobsResult.status === "fulfilled") setRecentJobs(jobsResult.value.items);
      if (draftResult.status === "fulfilled") setDraftTools(draftResult.value.items);
      if (artifactResult.status === "fulfilled") setArtifacts(artifactResult.value.items);

      const firstError = [
        dashboardResult,
        sourceResult,
        jobsResult,
        draftResult,
        artifactResult,
      ].find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
      if (firstError) setError(parseError(firstError.reason));

      if (!silent) setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    void refreshPage();
  }, [refreshPage]);

  useEffect(() => {
    if (!selectedSourceId) return;
    void loadSourceGraph(selectedSourceId);
  }, [loadSourceGraph, selectedSourceId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshPage({ silent: true, keepSelection: true });
      if (selectedSourceId) void loadSourceGraph(selectedSourceId);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loadSourceGraph, refreshPage, selectedSourceId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openSourceSheet = (source?: CrawlSource | null) => {
    setEditingSource(source ?? null);
    setSourceForm(sourceFormFromSource(source));
    setSheetMode("source");
    setFormError(null);
  };

  const openRuleSheet = (rule?: CrawlRule | null) => {
    setEditingRule(rule ?? null);
    setRuleForm(ruleFormFromRule(rule));
    setSheetMode("rule");
    setFormError(null);
  };

  const openFieldSheet = (field?: CrawlFieldDefine | null, ruleId?: string | null) => {
    setEditingField(field ?? null);
    setFieldRuleId(ruleId ?? field?.ruleId ?? null);
    setFieldForm(fieldFormFromField(field));
    setSheetMode("field");
    setFormError(null);
  };

  const closeSheet = () => {
    if (saving) return;
    setSheetMode(null);
    setEditingSource(null);
    setEditingRule(null);
    setEditingField(null);
    setFieldRuleId(null);
    setFormError(null);
  };

  const setSourceField = <K extends keyof SourceFormState>(key: K, value: SourceFormState[K]) => {
    setSourceForm((current) => ({ ...current, [key]: value }));
  };

  const setRuleField = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => {
    setRuleForm((current) => ({ ...current, [key]: value }));
  };

  const setFieldField = <K extends keyof FieldFormState>(key: K, value: FieldFormState[K]) => {
    setFieldForm((current) => ({ ...current, [key]: value }));
  };

  const handleSaveSheet = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (sheetMode === "source") {
        const payload = {
          name: sourceForm.name.trim(),
          slug: sourceForm.slug.trim() || undefined,
          kind: sourceForm.kind,
          baseUrl: sourceForm.baseUrl.trim(),
          adapterType: sourceForm.adapterType.trim(),
          status: sourceForm.status,
          schedule: sourceForm.schedule,
          crawlIntervalMinutes: Number(sourceForm.crawlIntervalMinutes),
          robotsTxt: sourceForm.robotsTxt.trim() || undefined,
          priority: Number(sourceForm.priority),
          config: parseJsonInput(sourceForm.config),
          metadata: parseJsonInput(sourceForm.metadata),
        };
        const saved = editingSource
          ? await updateCrawlSource(editingSource.id, payload)
          : await createCrawlSource(payload);
        setNotice(`Source saved: ${saved.name}`);
        setSelectedSourceId(saved.id);
      } else if (sheetMode === "rule" && activeSource) {
        const imported = parseImportedRuleBundle(ruleForm.importJson);
        const importedRule: Record<string, unknown> | null =
          imported?.rules && Array.isArray(imported.rules) ? (imported.rules[0] ?? null) : null;
        const payload = {
          name: String(importedRule?.name ?? ruleForm.name).trim(),
          code: String(importedRule?.code ?? ruleForm.code).trim(),
          ruleType: String(importedRule?.ruleType ?? ruleForm.ruleType),
          priority: Number(importedRule?.priority ?? ruleForm.priority),
          isEnabled: Boolean(importedRule?.isEnabled ?? ruleForm.isEnabled),
          listConfig: importedRule?.listConfig
            ? (importedRule.listConfig as Record<string, unknown>)
            : parseJsonInput(ruleForm.listConfig),
          detailConfig: importedRule?.detailConfig
            ? (importedRule.detailConfig as Record<string, unknown>)
            : parseJsonInput(ruleForm.detailConfig),
          parseConfig: importedRule?.parseConfig
            ? (importedRule.parseConfig as Record<string, unknown>)
            : parseJsonInput(ruleForm.parseConfig),
          requestConfig: importedRule?.requestConfig
            ? (importedRule.requestConfig as Record<string, unknown>)
            : parseJsonInput(ruleForm.requestConfig),
          metadata: importedRule?.metadata
            ? (importedRule.metadata as Record<string, unknown>)
            : parseJsonInput(ruleForm.metadata),
        };
        const saved = editingRule
          ? await updateCrawlRule(editingRule.id, payload)
          : await createCrawlRule(activeSource.id, payload);
        const importedFields = Array.isArray(imported?.fieldDefines) ? imported.fieldDefines : [];
        if (!editingRule && importedFields.length) {
          for (const field of importedFields) {
            const fieldKey = String(field.fieldKey ?? "").trim();
            if (!fieldKey) continue;
            await createCrawlFieldDefine(saved.id, {
              fieldKey,
              label: String(field.label ?? fieldKey).trim(),
              fieldType: String(field.fieldType ?? "TEXT").trim(),
              sourcePath: String(field.sourcePath ?? "").trim() || undefined,
              transform: String(field.transform ?? "").trim() || undefined,
              defaultValue: String(field.defaultValue ?? "").trim() || undefined,
              isRequired: Boolean(field.isRequired ?? false),
              isArray: Boolean(field.isArray ?? false),
              sortOrder: Number(field.sortOrder ?? 0),
              config:
                field.config && typeof field.config === "object"
                  ? (field.config as Record<string, unknown>)
                  : {},
              metadata:
                field.metadata && typeof field.metadata === "object"
                  ? (field.metadata as Record<string, unknown>)
                  : {},
            });
          }
        }
        setNotice(`Rule saved: ${saved.name}`);
        await loadSourceGraph(activeSource.id);
      } else if (sheetMode === "field" && fieldRuleId && activeSource) {
        const payload = {
          fieldKey: fieldForm.fieldKey.trim(),
          label: fieldForm.label.trim(),
          fieldType: fieldForm.fieldType,
          sourcePath: fieldForm.sourcePath.trim(),
          transform: fieldForm.transform.trim() || undefined,
          defaultValue: fieldForm.defaultValue.trim() || undefined,
          isRequired: fieldForm.isRequired,
          isArray: fieldForm.isArray,
          sortOrder: Number(fieldForm.sortOrder),
          config: parseJsonInput(fieldForm.config),
          metadata: parseJsonInput(fieldForm.metadata),
        };
        const saved = editingField
          ? await updateCrawlFieldDefine(editingField.id, payload)
          : await createCrawlFieldDefine(fieldRuleId, payload);
        setNotice(`Field saved: ${saved.fieldKey}`);
        await loadSourceGraph(activeSource.id);
      }

      setSheetMode(null);
      setEditingSource(null);
      setEditingRule(null);
      setEditingField(null);
      setFieldRuleId(null);
      await refreshPage({ silent: true, keepSelection: true });
    } catch (error) {
      setFormError(parseError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSource = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    await loadSourceGraph(sourceId);
  };

  const handleRunNow = async (source: CrawlSource) => {
    if (!canRunCrawler) return;
    setNotice(`Running crawl job for ${source.name}...`);
    await triggerCrawlerJob(source.id);
    await refreshPage({ silent: true, keepSelection: true });
    await loadSourceGraph(source.id);
    setNotice(`Queued manual crawl for ${source.name}`);
  };

  const handleRunFlow = async (source: CrawlSource) => {
    if (!canRunCrawler) return;
    setRunningSourceId(source.id);
    try {
      const result = await runCrawlerFlow(source.id);
      setNotice(
        `Flow done: found ${result.listItemsCount}, created ${result.created}, updated ${result.updated}`,
      );
      await refreshPage({ silent: true, keepSelection: true });
      await loadSourceGraph(source.id);
    } finally {
      setRunningSourceId((current) => (current === source.id ? null : current));
    }
  };

  const handleTestRule = async (rule: CrawlRule, phase: "LIST" | "DETAIL" | "CONTENT") => {
    if (!selectedSourceId) return;
    try {
      await testCrawlerStep(selectedSourceId, { phase, ruleId: rule.id });
      setNotice(`Test ${phase.toLowerCase()} finished for ${rule.name}`);
    } catch (error) {
      setNotice(parseError(error));
    }
  };

  const handleDeleteRule = async (rule: CrawlRule) => {
    await deleteCrawlRule(rule.id);
    setNotice(`Rule deleted: ${rule.name}`);
    if (activeSource) {
      await loadSourceGraph(activeSource.id);
    }
    await refreshPage({ silent: true, keepSelection: true });
  };

  const handleRunRule = async () => {
    if (!runRuleTarget) return;
    setRunningRuleId(runRuleTarget.id);
    setCommandOutput(`Running ${runRuleTarget.name}...\n`);
    try {
      const result = await runCrawlRule(runRuleTarget.id, {
        limit: Number(runLimit) || 10,
        dedupeExisting: runDedupeExisting,
      });
      setCommandOutput(result.output || result.command);
      setNotice(`Rule run finished: ${result.rule.name}`);
      const items = await fetchCrawlerArtifacts(undefined, 20);
      setArtifacts(items.items);
    } catch (error) {
      setCommandOutput(parseError(error));
      throw error;
    } finally {
      setRunningRuleId(null);
      setRunRuleTarget(null);
    }
  };

  const handleOpenArtifact = async (fileName: string) => {
    const detail = await fetchCrawlerArtifact(fileName);
    setSelectedArtifact(detail);
  };

  const importRuleFromText = (text: string) => {
    setRuleForm((current) => {
      const imported = parseImportedRuleBundle(text) ?? {};
      const sourceName = String(imported.source?.name ?? "").toLowerCase();
      const sourceSlug = String(imported.source?.slug ?? "").toLowerCase();
      const firstRule = imported.rules?.[0] ?? null;
      const inferredSource =
        sourceName.includes("futurepedia") || sourceSlug.includes("futurepedia")
          ? "Futurepedia"
          : sourceName.includes("taaft") ||
              sourceSlug.includes("taaft") ||
              sourceName.includes("theresanaiforthat")
            ? "TAAFT"
            : current.name;
      return {
        ...current,
        name: String(firstRule?.name ?? current.name ?? inferredSource),
        code: String(firstRule?.code ?? current.code ?? inferredSource).trim(),
        ruleType: String(firstRule?.ruleType ?? current.ruleType ?? "LIST"),
        priority: String(firstRule?.priority ?? current.priority ?? 100),
        isEnabled: Boolean(firstRule?.isEnabled ?? current.isEnabled ?? true),
        listConfig: JSON.stringify(firstRule?.listConfig ?? current.listConfig ?? {}, null, 2),
        detailConfig: JSON.stringify(
          firstRule?.detailConfig ?? current.detailConfig ?? {},
          null,
          2,
        ),
        parseConfig: JSON.stringify(firstRule?.parseConfig ?? current.parseConfig ?? {}, null, 2),
        requestConfig: JSON.stringify(
          firstRule?.requestConfig ?? current.requestConfig ?? {},
          null,
          2,
        ),
        metadata: JSON.stringify(firstRule?.metadata ?? current.metadata ?? {}, null, 2),
        importJson: text,
      };
    });
  };

  const handleTogglePause = async (source: CrawlSource) => {
    if (!canManageCrawler) return;
    const nextStatus = source.status === "PAUSED" ? "ENABLED" : "PAUSED";
    await setCrawlSourceStatus(source.id, nextStatus);
    setNotice(`Source ${source.name} is now ${nextStatus}`);
    await refreshPage({ silent: true, keepSelection: true });
    await loadSourceGraph(source.id);
  };

  const toggleDraftTool = (toolId: string) => {
    setSelectedDraftToolIds((current) =>
      current.includes(toolId) ? current.filter((item) => item !== toolId) : [...current, toolId],
    );
  };

  const handleBulkPublish = async () => {
    if (!selectedDraftToolIds.length) return;
    setBulkPublishing(true);
    try {
      await bulkPublishTools(selectedDraftToolIds);
      setNotice(`Published ${selectedDraftToolIds.length} draft tools`);
      setSelectedDraftToolIds([]);
      await refreshPage({ silent: true, keepSelection: true });
    } finally {
      setBulkPublishing(false);
    }
  };

  return (
    <RequirePermission permission={Permission.CrawlerRead}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeader
            title="Crawler"
            description={
              isLoading
                ? "Loading crawler data..."
                : "Monitor crawl sources, queues, and daily ingestion health."
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => openSourceSheet()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New source
            </Button>
            <Button variant="outline" onClick={() => void refreshPage({ keepSelection: true })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricConfig.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.key} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{metric.label}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-3xl font-semibold">
                  {resolveMetric(dashboard, metric.key)}
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">Crawl sources</h2>
              <p className="text-sm text-muted-foreground">
                Manage crawl sources, schedules, and daily ingestion health.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {dashboard
                ? `Rules ${dashboard.totalRules} 路 Records ${dashboard.totalRecords}`
                : "Loading..."}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Adapter</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Next run</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const selected = source.id === selectedSourceId;
                  return (
                    <tr
                      key={source.id}
                      className={`border-t ${selected ? "bg-primary/5" : "hover:bg-muted/40"}`}
                      onClick={() => void handleSelectSource(source.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{source.name}</div>
                        <div className="text-xs text-muted-foreground">{source.baseUrl}</div>
                      </td>
                      <td className="px-4 py-3">{source.adapterType}</td>
                      <td className="px-4 py-3">{source.status}</td>
                      <td className="px-4 py-3">{source.schedule ?? "MANUAL"}</td>
                      <td className="px-4 py-3">
                        {source.nextRunAt ? new Date(source.nextRunAt).toLocaleString() : "None"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canRunCrawler}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRunNow(source);
                            }}
                          >
                            Run now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canManageCrawler}
                            onClick={(event) => {
                              event.stopPropagation();
                              openSourceSheet(source);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canManageCrawler}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleTogglePause(source);
                            }}
                          >
                            {source.status === "PAUSED" ? "Resume" : "Pause"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!sources.length ? (
              <div className="border-t px-4 py-8 text-sm text-muted-foreground">
                No crawl sources found.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-base font-semibold">Task log</h3>
                <p className="text-sm text-muted-foreground">
                  {activeSource
                    ? `${activeSource.name} 路 ${activeSource.adapterType}`
                    : "Select a source to inspect."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!activeSource || !canRunCrawler || runningSourceId === activeSource?.id}
                  onClick={() => activeSource && void handleRunFlow(activeSource)}
                >
                  Run flow
                </Button>
                <Button
                  variant="outline"
                  disabled={!activeSource || !canManageCrawler}
                  onClick={() => openRuleSheet()}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New rule{activeSource ? ` for ${activeSource.name}` : ""}
                </Button>
              </div>
            </div>

            {activeSource ? (
              <div className="p-4 space-y-5">
                <div className="grid gap-4 xl:grid-cols-1">
                  <div className="rounded-lg border">
                    <div className="border-b px-4 py-3">
                      <h4 className="font-semibold">Rules</h4>
                      <p className="text-xs text-muted-foreground">
                        List, detail and content rules for the selected source.
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-[minmax(0,1.1fr)_90px_1.3fr] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                        <div>Rule</div>
                        <div>Type</div>
                        <div>Actions</div>
                      </div>
                      {(sourceGraph?.rules ?? []).map((rule) => (
                        <div key={rule.id} className="border-b px-4 py-3 last:border-b-0">
                          <div className="grid grid-cols-[minmax(0,1.1fr)_90px_1.3fr] gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {rule.ruleType} 路 {rule.code}
                              </div>
                            </div>
                            <div className="text-sm">{rule.ruleType}</div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRuleSheet(rule)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRunRuleTarget(rule);
                                  setRunLimit("10");
                                  setRunDedupeExisting(true);
                                }}
                              >
                                Run
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleTestRule(rule, "LIST")}
                              >
                                Test list
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleTestRule(rule, "DETAIL")}
                              >
                                Test detail
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleTestRule(rule, "CONTENT")}
                              >
                                Test content
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openFieldSheet(undefined, rule.id)}
                              >
                                Add field
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDeleteRule(rule)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2 rounded-md bg-muted/10 p-3">
                            <div className="text-xs font-medium text-muted-foreground">Fields</div>
                            {(rule.fields ?? []).map((field) => (
                              <div
                                key={field.id}
                                className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                              >
                                <div>
                                  <div className="text-sm font-medium">{field.fieldKey}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {field.fieldType} 路 {field.sourcePath || "no source path"}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openFieldSheet(field, field.ruleId)}
                                >
                                  Edit
                                </Button>
                              </div>
                            ))}
                            {!rule.fields?.length ? (
                              <div className="text-sm text-muted-foreground">
                                No fields defined yet.
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {!sourceGraph?.rules.length ? (
                        <div className="text-sm text-muted-foreground">
                          No rules found for this source.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border">
                      <div className="border-b px-4 py-3">
                        <h4 className="font-semibold">Recent jobs</h4>
                        <p className="text-xs text-muted-foreground">
                          Latest crawl runs and import results.
                        </p>
                      </div>
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,1fr)_110px_1.2fr] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                          <div>Source</div>
                          <div>Status</div>
                          <div>Items</div>
                        </div>
                        {recentJobs.slice(0, 5).map((job) => (
                          <div
                            key={job.id}
                            className="grid grid-cols-[minmax(0,1fr)_110px_1.2fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {job.source?.name ?? "Unknown source"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">{job.id}</div>
                            </div>
                            <div>{job.status}</div>
                            <div className="text-xs text-muted-foreground">
                              found {job.itemsFound ?? 0}, created {job.itemsCreated ?? 0}, updated{" "}
                              {job.itemsUpdated ?? 0}
                            </div>
                          </div>
                        ))}
                        {!recentJobs.length ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground">
                            No recent jobs found.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      <div className="border-b px-4 py-3">
                        <h4 className="font-semibold">Draft tools ready to publish</h4>
                        <p className="text-xs text-muted-foreground">
                          Crawler-created draft tools waiting for manual publish.
                        </p>
                      </div>
                      <div className="space-y-2 p-4">
                        {draftTools.slice(0, 6).map((tool) => (
                          <label
                            key={tool.id}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                          >
                            <div>
                              <div className="text-sm font-medium">{tool.name}</div>
                              <div className="text-xs text-muted-foreground">{tool.website}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedDraftToolIds.includes(tool.id)}
                              onChange={() => toggleDraftTool(tool.id)}
                            />
                          </label>
                        ))}
                        {!draftTools.length ? (
                          <div className="text-sm text-muted-foreground">No draft tools found.</div>
                        ) : null}
                      </div>
                      <div className="flex justify-end border-t px-4 py-3">
                        <Button
                          onClick={() => void handleBulkPublish()}
                          disabled={!selectedDraftToolIds.length || bulkPublishing}
                        >
                          Publish selected
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-lg border">
                    <div className="border-b px-4 py-3">
                      <h4 className="font-semibold">Recent records</h4>
                      <p className="text-xs text-muted-foreground">
                        Latest parsed records from this source.
                      </p>
                    </div>
                    <div className="space-y-2 p-4">
                      {(sourceGraph?.records ?? []).slice(0, 8).map((record) => (
                        <div key={record.id} className="rounded-md border px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                              {record.title ?? record.sourceUrl}
                            </div>
                            <div className="text-xs">{record.status}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {record.sourceUrl}
                          </div>
                        </div>
                      ))}
                      {!sourceGraph?.records.length ? (
                        <div className="text-sm text-muted-foreground">No records yet.</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <div>
                      <h4 className="font-semibold">Task log</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedJob
                          ? `Showing job ${selectedJob.id}`
                          : "Run the selected source flow to see step-by-step output."}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedJob?.status ?? "No job"}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 grid grid-cols-3 gap-3 rounded-md border bg-muted/10 px-3 py-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <div className="mt-1 font-medium">{selectedJob?.status ?? "No job"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Items</div>
                        <div className="mt-1 font-medium">
                          {selectedJob
                            ? `${selectedJob.itemsFound ?? 0}/${selectedJob.itemsCreated ?? 0}/${selectedJob.itemsUpdated ?? 0}`
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Source</div>
                        <div className="mt-1 font-medium">
                          {selectedJob?.source?.name ?? activeSource?.name ?? "-"}
                        </div>
                      </div>
                    </div>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                      {selectedJob ? formatJobLog(selectedJob) : "No flow log yet."}
                    </pre>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h4 className="font-semibold">Command output</h4>
                    <p className="text-xs text-muted-foreground">
                      规则运行时的命令和进度输出会显示在这里。
                    </p>
                  </div>
                  <div className="p-4">
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                      {commandOutput}
                    </pre>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h4 className="font-semibold">Saved candidate results</h4>
                    <p className="text-xs text-muted-foreground">
                      采集结果不入库，先保存到 `storage/auto-update/candidates` 供审核查看。
                    </p>
                  </div>
                  <div className="divide-y">
                    {artifacts.map((artifact) => (
                      <button
                        key={artifact.fileName}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20"
                        onClick={() => void handleOpenArtifact(artifact.fileName)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{artifact.fileName}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {artifact.fullPath}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {new Date(artifact.updatedAt).toLocaleString()}
                        </div>
                      </button>
                    ))}
                    {!artifacts.length ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        No saved candidate files.
                      </div>
                    ) : null}
                  </div>
                  {selectedArtifact ? (
                    <div className="border-t p-4">
                      <div className="mb-2 text-sm font-medium">{selectedArtifact.fileName}</div>
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                        {selectedArtifact.raw}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="p-8 text-sm text-muted-foreground">
                Select a source to inspect its rules and records.
              </div>
            )}
          </div>
        </section>

        {runRuleTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Run rule: {runRuleTarget.name}</h3>
                <p className="text-sm text-muted-foreground">
                  填写采集数量，并默认与现有工具库做去重对比。
                </p>
              </div>
              <div className="space-y-4">
                <Field label="采集数量" type="number" value={runLimit} onChange={setRunLimit} />
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={runDedupeExisting}
                    onChange={(event) => setRunDedupeExisting(event.target.checked)}
                  />
                  <span>与现有库去重对比</span>
                </label>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRunRuleTarget(null)}
                  disabled={runningRuleId === runRuleTarget.id}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleRunRule()}
                  disabled={runningRuleId === runRuleTarget.id}
                >
                  {runningRuleId === runRuleTarget.id ? "Running..." : "Run"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Sheet open={sheetMode !== null} onOpenChange={(open) => !open && closeSheet()}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>
                {sheetMode === "rule"
                  ? editingRule
                    ? `Edit rule: ${editingRule.name}`
                    : `Create rule for ${activeSourceName || "source"}`
                  : sheetMode === "field"
                    ? editingField
                      ? `Edit field: ${editingField.fieldKey}`
                      : "Create field"
                    : editingSource
                      ? `Edit source: ${editingSource.name}`
                      : "Create source"}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                All crawler config stays in the local database. Saving refreshes the selected source
                automatically.
              </p>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {formError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              {sheetMode === "source" ? (
                <>
                  <Field
                    label="Name"
                    value={sourceForm.name}
                    onChange={(value) => setSourceField("name", value)}
                  />
                  <Field
                    label="Slug"
                    value={sourceForm.slug}
                    onChange={(value) => setSourceField("slug", value)}
                  />
                  <Field
                    label="Kind"
                    value={sourceForm.kind}
                    onChange={(value) => setSourceField("kind", value)}
                  />
                  <Field
                    label="Base URL"
                    value={sourceForm.baseUrl}
                    onChange={(value) => setSourceField("baseUrl", value)}
                  />
                  <Field
                    label="Adapter Type"
                    value={sourceForm.adapterType}
                    onChange={(value) => setSourceField("adapterType", value)}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Status</span>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2"
                        value={sourceForm.status}
                        onChange={(event) =>
                          setSourceField("status", event.target.value as SourceFormState["status"])
                        }
                      >
                        <option value="ENABLED">ENABLED</option>
                        <option value="PAUSED">PAUSED</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Schedule</span>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2"
                        value={sourceForm.schedule}
                        onChange={(event) => setSourceField("schedule", event.target.value)}
                      >
                        <option value="MANUAL">MANUAL</option>
                        <option value="HOURLY">HOURLY</option>
                        <option value="DAILY">DAILY</option>
                        <option value="WEEKLY">WEEKLY</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Crawl interval minutes"
                      type="number"
                      value={sourceForm.crawlIntervalMinutes}
                      onChange={(value) => setSourceField("crawlIntervalMinutes", value)}
                    />
                    <Field
                      label="Priority"
                      type="number"
                      value={sourceForm.priority}
                      onChange={(value) => setSourceField("priority", value)}
                    />
                  </div>

                  <Field
                    label="Robots TXT"
                    value={sourceForm.robotsTxt}
                    onChange={(value) => setSourceField("robotsTxt", value)}
                  />
                  <Textarea
                    label="Config JSON"
                    value={sourceForm.config}
                    onChange={(value) => setSourceField("config", value)}
                    rows={8}
                  />
                  <Textarea
                    label="Metadata JSON"
                    value={sourceForm.metadata}
                    onChange={(value) => setSourceField("metadata", value)}
                    rows={8}
                  />
                </>
              ) : null}

              {sheetMode === "rule" ? (
                <>
                  <Field
                    label="Name"
                    value={ruleForm.name}
                    onChange={(value) => setRuleField("name", value)}
                  />
                  <Field
                    label="Code"
                    value={ruleForm.code}
                    onChange={(value) => setRuleField("code", value)}
                  />
                  <Field
                    label="Rule Type"
                    value={ruleForm.ruleType}
                    onChange={(value) => setRuleField("ruleType", value)}
                  />
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">Import local rule file or paste JSON</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="w-full rounded-md border bg-background px-3 py-2"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = typeof reader.result === "string" ? reader.result : "";
                          setRuleField("importJson", text);
                          try {
                            if (text.trim()) importRuleFromText(text);
                          } catch {
                            // 允许先导入原始内容，再手动修正。
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                  <Textarea
                    label="Imported Rule JSON"
                    value={ruleForm.importJson}
                    onChange={(value) => {
                      setRuleField("importJson", value);
                      try {
                        if (value.trim()) importRuleFromText(value);
                      } catch {
                        // 允许先粘贴原始内容，再手动修正。
                      }
                    }}
                    rows={8}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Priority"
                      type="number"
                      value={ruleForm.priority}
                      onChange={(value) => setRuleField("priority", value)}
                    />
                    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={ruleForm.isEnabled}
                        onChange={(event) => setRuleField("isEnabled", event.target.checked)}
                      />
                      <span>Enabled</span>
                    </label>
                  </div>
                  <Textarea
                    label="List Config JSON"
                    value={ruleForm.listConfig}
                    onChange={(value) => setRuleField("listConfig", value)}
                    rows={5}
                  />
                  <Textarea
                    label="Detail Config JSON"
                    value={ruleForm.detailConfig}
                    onChange={(value) => setRuleField("detailConfig", value)}
                    rows={5}
                  />
                  <Textarea
                    label="Parse Config JSON"
                    value={ruleForm.parseConfig}
                    onChange={(value) => setRuleField("parseConfig", value)}
                    rows={5}
                  />
                  <Textarea
                    label="Request Config JSON"
                    value={ruleForm.requestConfig}
                    onChange={(value) => setRuleField("requestConfig", value)}
                    rows={5}
                  />
                  <Textarea
                    label="Metadata JSON"
                    value={ruleForm.metadata}
                    onChange={(value) => setRuleField("metadata", value)}
                    rows={5}
                  />
                </>
              ) : null}

              {sheetMode === "field" ? (
                <>
                  <Field
                    label="Field Key"
                    value={fieldForm.fieldKey}
                    onChange={(value) => setFieldField("fieldKey", value)}
                  />
                  <Field
                    label="Label"
                    value={fieldForm.label}
                    onChange={(value) => setFieldField("label", value)}
                  />
                  <Field
                    label="Field Type"
                    value={fieldForm.fieldType}
                    onChange={(value) => setFieldField("fieldType", value)}
                  />
                  <Field
                    label="Source Path"
                    value={fieldForm.sourcePath}
                    onChange={(value) => setFieldField("sourcePath", value)}
                  />
                  <Field
                    label="Transform"
                    value={fieldForm.transform}
                    onChange={(value) => setFieldField("transform", value)}
                  />
                  <Field
                    label="Default Value"
                    value={fieldForm.defaultValue}
                    onChange={(value) => setFieldField("defaultValue", value)}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={fieldForm.isRequired}
                        onChange={(event) => setFieldField("isRequired", event.target.checked)}
                      />
                      <span>Required</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={fieldForm.isArray}
                        onChange={(event) => setFieldField("isArray", event.target.checked)}
                      />
                      <span>Array</span>
                    </label>
                  </div>
                  <Field
                    label="Sort Order"
                    type="number"
                    value={fieldForm.sortOrder}
                    onChange={(value) => setFieldField("sortOrder", value)}
                  />
                  <Textarea
                    label="Config JSON"
                    value={fieldForm.config}
                    onChange={(value) => setFieldField("config", value)}
                    rows={5}
                  />
                  <Textarea
                    label="Metadata JSON"
                    value={fieldForm.metadata}
                    onChange={(value) => setFieldField("metadata", value)}
                    rows={5}
                  />
                </>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={closeSheet} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveSheet()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </RequirePermission>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        className="w-full rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        rows={rows}
        className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
