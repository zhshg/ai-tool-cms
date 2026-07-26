"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileJson,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  executeToolImport,
  getApiErrorMessage,
  previewToolImport,
  type ApiError,
  type ImportExecuteResponse,
  type ImportPreviewResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { extractImportJsonRecords } from "@/lib/tool-import";

type ImportFormat = "csv" | "json";
type Step = "upload" | "preview" | "validation" | "import" | "summary";

type LocalRow = {
  index: number;
  name: string;
  slug: string;
  website: string;
  shortDescription: string;
  category: string;
  tags: string;
  pricing: string;
  features: string;
  alternatives: string;
  status: string;
  errors: string[];
};

const requiredFields = [
  "name",
  "slug",
  "website",
  "shortDescription",
  "description",
  "category",
  "pricing",
  "status",
];

export default function ImportCenterPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [fileName, setFileName] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [rows, setRows] = useState<LocalRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const localErrorCount = useMemo(
    () => rows.reduce((total, row) => total + row.errors.length, 0),
    [rows],
  );
  const previewRows = useMemo(() => rows.slice(0, 12), [rows]);
  const progress = result ? 100 : isImporting ? 66 : preview ? 50 : content ? 25 : 0;
  const blockingPreviewIssues = useMemo(
    () =>
      (preview?.records ?? []).filter((item) => !item.valid || (item.duplicate && !skipDuplicates))
        .length,
    [preview, skipDuplicates],
  );

  async function handleFile(file: File) {
    const detectedFormat = detectFormat(file.name);
    if (!detectedFormat) {
      setError("Only CSV and JSON files are supported.");
      return;
    }

    setError(null);
    setPreview(null);
    setResult(null);
    setStep("preview");
    setFormat(detectedFormat);
    setFileName(file.name);

    const text = await file.text();
    setContent(text);
    setRows(parseLocalRows(detectedFormat, text));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) void handleFile(file);
  }

  async function runPreview() {
    if (!content) return;
    setIsPreviewing(true);
    setError(null);
    setResult(null);
    try {
      const response = await previewToolImport(format, content);
      setPreview(response);
      setStep("validation");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function runImport() {
    if (!content || !preview) return;
    if (localErrorCount > 0) {
      setError("Fix local validation errors before importing.");
      return;
    }
    if (blockingPreviewIssues > 0) {
      setError("Preview contains invalid or duplicate rows. Resolve them before importing.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setStep("import");
    try {
      const response = await executeToolImport(format, content, {
        skipDuplicates,
      });
      setResult(response);
      setStep("summary");
    } catch (err) {
      setError(formatApiError(err));
      setStep("validation");
    } finally {
      setIsImporting(false);
    }
  }

  function resetImport() {
    setStep("upload");
    setFileName("");
    setContent("");
    setRows([]);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <RequirePermission permission={Permission.ToolsCreate}>
      <div className="space-y-6">
        <PageHeader
          title="Import Center"
          description="Bulk import AI tools from CSV or JSON with preview, duplicate review, category validation, SEO checks, and confirmation before write."
        />

        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard label="Rows" value={rows.length} />
          <MetricCard label="Valid" value={preview?.valid ?? 0} />
          <MetricCard label="Invalid" value={preview?.invalid ?? localErrorCount} />
          <MetricCard label="Duplicates" value={preview?.duplicates ?? 0} />
          <MetricCard label="Missing Category" value={preview?.missingCategory ?? 0} />
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Import progress</p>
              <p className="text-xs text-muted-foreground">
                {"Upload -> Preview -> Validation -> Import -> Summary"}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              {step}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          className="rounded-xl border border-dashed bg-card p-8 text-center text-card-foreground shadow-sm transition hover:border-primary/70"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <UploadCloud className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Upload CSV or JSON</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Supported fields: name, slug, websiteUrl, logoUrl, shortDescription, description,
            categorySlug, pricing, tags, features, useCases, alternatives, seoTitle, seoDescription,
            status. Multi-value CSV fields can use pipe separators.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => inputRef.current?.click()}
            >
              Choose File
            </button>
            {content ? (
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                onClick={resetImport}
              >
                Reset
              </button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {content ? (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
            <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-3">
                  {format === "csv" ? (
                    <FileSpreadsheet className="size-5" />
                  ) : (
                    <FileJson className="size-5" />
                  )}
                  <div>
                    <h2 className="font-semibold">File preview</h2>
                    <p className="text-sm text-muted-foreground">{fileName || "Untitled import"}</p>
                  </div>
                </div>
                <span className="rounded-full border px-3 py-1 text-xs uppercase text-muted-foreground">
                  {format}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Website</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Pricing</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const remote = preview?.records.find((item) => item.index === row.index);
                      return (
                        <tr key={row.index} className="border-b last:border-0">
                          <td className="px-4 py-3 text-muted-foreground">{row.index + 1}</td>
                          <td className="px-4 py-3 font-medium">{row.name || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.slug || remote?.slug || "-"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.website || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.category || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.pricing || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.status || "-"}</td>
                          <td className="px-4 py-3">
                            <RowStatus row={row} remote={remote} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 12 ? (
                <p className="border-t px-5 py-3 text-xs text-muted-foreground">
                  Showing first 12 rows of {rows.length}.
                </p>
              ) : null}
            </section>

            <aside className="space-y-4">
              <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                <h2 className="font-semibold">Validation</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <ChecklistItem ok={Boolean(content)} label="File loaded" />
                  <ChecklistItem ok={rows.length > 0} label="Rows parsed" />
                  <ChecklistItem ok={localErrorCount === 0} label="Required fields valid" />
                  <ChecklistItem ok={Boolean(preview)} label="API review completed" />
                  <ChecklistItem
                    ok={!preview || blockingPreviewIssues === 0}
                    label="No invalid or duplicate rows remaining"
                  />
                </div>
              </section>

              <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                <h2 className="font-semibold">Import options</h2>
                <label className="mt-4 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={skipDuplicates}
                    onChange={(event) => setSkipDuplicates(event.target.checked)}
                  />
                  <span>
                    Skip duplicates
                    <span className="block text-xs text-muted-foreground">
                      Duplicate slug, name, or website domain matches will be marked and skipped.
                    </span>
                  </span>
                </label>
                <div className="mt-4 rounded-md border bg-muted/20 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CircleAlert className="mt-0.5 size-4 text-amber-600" />
                    <p className="text-muted-foreground">
                      Preview does not write data. Confirm Import only becomes available when all
                      rows pass validation and duplicate review.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void runPreview()}
                    disabled={!content || isPreviewing || isImporting}
                  >
                    {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : null}
                    Preview / Dry Run
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void runImport()}
                    disabled={
                      !preview || isImporting || localErrorCount > 0 || blockingPreviewIssues > 0
                    }
                  >
                    {isImporting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Confirm Import
                  </button>
                </div>
              </section>
            </aside>
          </div>
        ) : null}

        {preview ? (
          <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="font-semibold">Preview Summary</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-6">
              <MetricCard label="Total" value={preview.total} />
              <MetricCard label="Valid" value={preview.valid} />
              <MetricCard label="Invalid" value={preview.invalid} />
              <MetricCard label="Duplicates" value={preview.duplicates} />
              <MetricCard label="Missing Category" value={preview.missingCategory} />
              <MetricCard label="Missing SEO" value={preview.missingSeo} />
            </div>
            <div className="mt-4 max-h-72 overflow-auto rounded-md border">
              {preview.records.map((record) => (
                <div
                  key={record.index}
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">{record.name || `Row ${record.index + 1}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.slug} · {record.website}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        !record.valid
                          ? "text-destructive"
                          : record.duplicate
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }
                    >
                      {!record.valid ? "Invalid" : record.duplicate ? "Duplicate" : "Ready"}
                    </p>
                    {record.errors.length ? (
                      <p className="text-xs text-destructive">{record.errors.join(", ")}</p>
                    ) : null}
                    {record.duplicateReasons.length ? (
                      <p className="text-xs text-amber-700">{record.duplicateReasons.join(", ")}</p>
                    ) : null}
                    {record.warnings.length ? (
                      <p className="text-xs text-muted-foreground">{record.warnings.join(", ")}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {result ? (
          <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="font-semibold">Import result report</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MetricCard label="Imported" value={result.importedCount} />
              <MetricCard label="Skipped" value={result.skippedCount} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ResultList
                title="Imported tools"
                items={result.imported.map((item) => `${item.name} (${item.slug})`)}
                empty="No tools imported."
              />
              <ResultList
                title="Skipped rows"
                items={result.skipped.map((item) => `${item.name || item.slug}: ${item.reason}`)}
                empty="No rows skipped."
              />
            </div>
          </section>
        ) : null}
      </div>
    </RequirePermission>
  );
}

function detectFormat(fileName: string): ImportFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  return null;
}

function parseLocalRows(format: ImportFormat, content: string): LocalRow[] {
  try {
    if (format === "json") {
      const parsed = JSON.parse(content) as unknown;
      const records = extractImportJsonRecords(parsed);
      if (!records) throw new Error("Unsupported JSON shape");
      return records.map((item, index) => normalizeRow(item, index));
    }

    const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
    const headers = splitCsvLine(headerLine).map((header) => header.trim());
    return lines.map((line, index) => {
      const values = splitCsvLine(line);
      const record = headers.reduce<Record<string, string>>((acc, header, valueIndex) => {
        acc[header] = values[valueIndex]?.trim() ?? "";
        return acc;
      }, {});
      return normalizeRow(record, index);
    });
  } catch {
    return [
      {
        index: 0,
        name: "",
        slug: "",
        website: "",
        shortDescription: "",
        category: "",
        tags: "",
        pricing: "",
        features: "",
        alternatives: "",
        status: "",
        errors: ["Unable to parse file content"],
      },
    ];
  }
}

function normalizeRow(record: Record<string, unknown>, index: number): LocalRow {
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : undefined;
  const metadataSourceCategories = Array.isArray(metadata?.sourceCategories)
    ? metadata.sourceCategories
    : undefined;
  const metadataCategorySlugs = metadataSourceCategories
    ?.map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const slug = (item as Record<string, unknown>).slug;
      return typeof slug === "string" ? slug.trim() : undefined;
    })
    .filter((item): item is string => Boolean(item));

  const row = {
    index,
    name: stringValue(record.name),
    slug: stringValue(record.slug),
    website: stringValue(record.website ?? record.websiteUrl),
    shortDescription: stringValue(record.shortDescription ?? record.summary),
    category: stringValue(
      record.categorySlug ??
        record.category ??
        record.categories ??
        record.primary_category ??
        metadataCategorySlugs,
    ),
    tags: stringValue(record.tags),
    pricing: stringValue(record.pricing ?? record.pricingModel ?? metadata?.sourcePricingModel),
    features: stringValue(record.features),
    alternatives: stringValue(record.alternatives),
    status: stringValue(record.status),
  };

  const errors = requiredFields.flatMap((field) => {
    const value = stringValue(
      record[field] ??
        (field === "website" ? record.websiteUrl : undefined) ??
        (field === "shortDescription" ? record.summary : undefined) ??
        (field === "category"
          ? (record.categorySlug ?? record.categories ?? metadataCategorySlugs)
          : undefined) ??
        (field === "pricing" ? (record.pricingModel ?? metadata?.sourcePricingModel) : undefined),
    );
    return value ? [] : [`Missing ${field}`];
  });

  if (row.website && !/^https?:\/\//i.test(row.website)) {
    errors.push("Website must start with http:// or https://");
  }
  if (row.shortDescription && row.shortDescription.length > 120) {
    errors.push("shortDescription must be 120 characters or fewer");
  }
  if (countMultiValue(record.tags) > 0 && countMultiValue(record.tags) < 2) {
    errors.push("tags must include at least 2 items");
  }
  if (countMultiValue(record.features) > 0 && countMultiValue(record.features) < 3) {
    errors.push("features must include at least 3 items");
  }
  if (countMultiValue(record.alternatives) > 0 && countMultiValue(record.alternatives) < 2) {
    errors.push("alternatives must include at least 2 items");
  }

  return { ...row, errors };
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function stringValue(value: unknown) {
  if (Array.isArray(value))
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join("|");
  return String(value ?? "").trim();
}

function countMultiValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).length;
  }
  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean).length;
  }
  return 0;
}

function formatApiError(err: unknown) {
  const apiError = err as ApiError;
  if (apiError?.status) return `API error ${apiError.status}: ${getApiErrorMessage(apiError)}`;
  return err instanceof Error ? err.message : "Import request failed.";
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function RowStatus({
  row,
  remote,
}: {
  row: LocalRow;
  remote?: ImportPreviewResponse["records"][number];
}) {
  if (row.errors.length) {
    return <span className="text-destructive">{row.errors.join(", ")}</span>;
  }
  if (remote && !remote.valid) {
    return <span className="text-destructive">{remote.errors.join(", ")}</span>;
  }
  if (remote?.duplicate) {
    return (
      <span className="text-amber-600">{remote.duplicateReasons.join(", ") || "Duplicate"}</span>
    );
  }
  if (remote) {
    return <span className="text-emerald-600">Ready</span>;
  }
  return <span className="text-muted-foreground">Pending dry run</span>;
}

function ResultList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="font-medium">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.slice(0, 20).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
