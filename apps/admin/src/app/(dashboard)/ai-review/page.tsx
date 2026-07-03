"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, History, RefreshCw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  approveAiRevision,
  archiveAiReviewTool,
  bulkApproveAiRevisions,
  bulkGenerateAiTools,
  bulkRejectAiRevisions,
  compareAiRevision,
  editAiRevision,
  fetchAiReviewHistory,
  fetchAiRevision,
  fetchAiRevisions,
  publishAiReviewTool,
  regenerateAiTool,
  rejectAiRevision,
  type AiReviewHistoryResponse,
  type AiRevision,
  type AiRevisionCompareResponse,
  type ApiError,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

type ReviewTab = "PENDING" | "APPROVED" | "REJECTED";

const tabs: { key: ReviewTab; label: string; icon: typeof Bot }[] = [
  { key: "PENDING", label: "Pending Review", icon: Bot },
  { key: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { key: "REJECTED", label: "Rejected", icon: XCircle },
];

export default function AiReviewPage() {
  const [activeTab, setActiveTab] = useState<ReviewTab>("PENDING");
  const [items, setItems] = useState<AiRevision[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [previewRevision, setPreviewRevision] = useState<AiRevision | null>(null);
  const [compareData, setCompareData] = useState<AiRevisionCompareResponse | null>(null);
  const [historyData, setHistoryData] = useState<AiReviewHistoryResponse | null>(null);
  const [editablePayload, setEditablePayload] = useState("");

  const selectedPendingIds = useMemo(
    () =>
      selectedIds.filter((id) => items.some((item) => item.id === id && item.status === "PENDING")),
    [items, selectedIds],
  );

  const loadCurrentTab = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAiRevisions(activeTab);
      setItems(data.items);
      setTotal(data.total);
      setSelectedIds([]);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadCurrentTab();
  }, [loadCurrentTab]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handlePreview(revision: AiRevision) {
    try {
      setRunningId(revision.id);
      const detail = await fetchAiRevision(revision.id);
      setPreviewRevision(detail);
      setEditablePayload(JSON.stringify(detail.payload ?? {}, null, 2));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handleCompare(revision: AiRevision) {
    try {
      setRunningId(revision.id);
      setCompareData(await compareAiRevision(revision.id));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handleSaveEdit() {
    if (!previewRevision) return;
    try {
      setRunningId(previewRevision.id);
      const payload = JSON.parse(editablePayload || "{}");
      const updated = await editAiRevision(previewRevision.id, payload, reviewNote || undefined);
      setPreviewRevision(updated);
      setMessage("Revision payload saved for review.");
      await loadCurrentTab();
    } catch (err) {
      setError({ status: 400, message: err instanceof Error ? err.message : "Invalid payload" });
    } finally {
      setRunningId(null);
    }
  }

  async function handleApprove(revision: AiRevision) {
    try {
      setRunningId(revision.id);
      await approveAiRevision(revision.id, reviewNote || undefined);
      setMessage(`Approved revision for ${revision.tool?.name ?? "tool"}.`);
      await loadCurrentTab();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handleReject(revision: AiRevision) {
    try {
      setRunningId(revision.id);
      await rejectAiRevision(revision.id, reviewNote || undefined);
      setMessage(`Rejected revision for ${revision.tool?.name ?? "tool"}.`);
      await loadCurrentTab();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handleBulkApprove() {
    if (!selectedPendingIds.length) return;
    setIsBulkRunning(true);
    try {
      const result = await bulkApproveAiRevisions(selectedPendingIds, reviewNote || undefined);
      setMessage(`Bulk approved ${result.approved} revision(s).`);
      await loadCurrentTab();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsBulkRunning(false);
    }
  }

  async function handleBulkReject() {
    if (!selectedPendingIds.length) return;
    setIsBulkRunning(true);
    try {
      const result = await bulkRejectAiRevisions(selectedPendingIds, reviewNote || undefined);
      setMessage(`Bulk rejected ${result.rejected} revision(s).`);
      await loadCurrentTab();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsBulkRunning(false);
    }
  }

  async function handleBulkGenerate() {
    const toolIds = items.map((item) => item.tool?.id).filter((id): id is string => Boolean(id));
    if (!toolIds.length) return;
    setIsBulkRunning(true);
    try {
      const result = await bulkGenerateAiTools(toolIds);
      setMessage(`Queued ${result.queued} AI generation job(s).`);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsBulkRunning(false);
    }
  }

  async function handleRegenerate(revision: AiRevision) {
    if (!revision.tool?.id) return;
    try {
      setRunningId(revision.id);
      await regenerateAiTool(revision.tool.id);
      setMessage(`Queued regenerate for ${revision.tool.name}.`);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handlePublish(revision: AiRevision) {
    if (!revision.tool?.id) return;
    try {
      setRunningId(revision.id);
      await publishAiReviewTool(revision.tool.id);
      setMessage(`Published ${revision.tool.name}.`);
      await loadCurrentTab();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handleArchive(revision: AiRevision) {
    if (!revision.tool?.id) return;
    try {
      setRunningId(revision.id);
      await archiveAiReviewTool(revision.tool.id);
      setMessage(`Archived ${revision.tool.name}.`);
      await loadCurrentTab();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  async function handleHistory(revision: AiRevision) {
    if (!revision.tool?.id) return;
    try {
      setRunningId(revision.id);
      setHistoryData(await fetchAiReviewHistory(revision.tool.id));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setRunningId(null);
    }
  }

  return (
    <RequirePermission permission={Permission.AiRead}>
      <div>
        <PageHeader
          title="AI Review"
          description="Review queue for Imported -> AI Generated -> Pending Review -> Approved -> Published -> Archived."
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-card-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
              disabled={!selectedPendingIds.length || isBulkRunning}
              onClick={() => void handleBulkApprove()}
            >
              Bulk Approve
            </button>
            <button
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
              disabled={!selectedPendingIds.length || isBulkRunning}
              onClick={() => void handleBulkReject()}
            >
              Bulk Reject
            </button>
            <button
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
              disabled={!items.some((item) => item.tool?.id) || isBulkRunning}
              onClick={() => void handleBulkGenerate()}
            >
              Bulk Generate
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <Metric label="Queue" value={activeTab} />
          <Metric label="Total revisions" value={total} />
          <Metric label="Selected" value={selectedIds.length} />
          <Metric
            label="Average quality"
            value={
              items.length
                ? Math.round(
                    items.reduce((sum, item) => sum + (item.qualityScore ?? 0), 0) / items.length,
                  )
                : 0
            }
          />
        </div>

        <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Review note</span>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Reusable note for approve / reject / edit actions."
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-medium">Review Queue</h2>
            <button
              type="button"
              onClick={() => void loadCurrentTab()}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {message ? (
            <p className="border-b bg-emerald-50 px-6 py-3 text-sm text-emerald-700">{message}</p>
          ) : null}
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading revisions...</p>
          ) : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {error.message}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No revisions found.</p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Select</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Quality</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((revision) => (
                  <tr key={revision.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(revision.id)}
                        onChange={() => toggleSelected(revision.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{revision.tool?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {revision.tool?.status ?? "No status"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{revision.stage}</td>
                    <td className="px-4 py-3">{revision.status}</td>
                    <td className="px-4 py-3">{revision.qualityScore ?? "N/A"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          label="Compare"
                          disabled={runningId === revision.id}
                          onClick={() => void handleCompare(revision)}
                        />
                        <ActionButton
                          label="Edit"
                          disabled={runningId === revision.id}
                          onClick={() => void handlePreview(revision)}
                        />
                        {activeTab === "PENDING" ? (
                          <ActionButton
                            label="Approve"
                            disabled={runningId === revision.id}
                            onClick={() => void handleApprove(revision)}
                          />
                        ) : null}
                        {activeTab === "PENDING" ? (
                          <ActionButton
                            label="Reject"
                            disabled={runningId === revision.id}
                            onClick={() => void handleReject(revision)}
                          />
                        ) : null}
                        <ActionButton
                          label="Publish"
                          disabled={runningId === revision.id || !revision.tool?.id}
                          onClick={() => void handlePublish(revision)}
                        />
                        <ActionButton
                          label="Archive"
                          disabled={runningId === revision.id || !revision.tool?.id}
                          onClick={() => void handleArchive(revision)}
                        />
                        <ActionButton
                          label="Regenerate"
                          disabled={runningId === revision.id || !revision.tool?.id}
                          onClick={() => void handleRegenerate(revision)}
                        />
                        <button
                          type="button"
                          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
                          disabled={runningId === revision.id || !revision.tool?.id}
                          onClick={() => void handleHistory(revision)}
                        >
                          <History className="mr-1 inline h-3.5 w-3.5" />
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {compareData ? (
          <JsonPanel
            title="Compare Changes"
            data={{ current: compareData.current, proposed: compareData.proposed }}
            onClose={() => setCompareData(null)}
          />
        ) : null}

        {previewRevision ? (
          <div className="mt-6 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Edit Generated Payload</h2>
                <p className="text-xs text-muted-foreground">
                  {previewRevision.tool?.name ?? "Unknown tool"} / {previewRevision.stage}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                  onClick={() => void handleSaveEdit()}
                  disabled={runningId === previewRevision.id}
                >
                  Save Edit
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                  onClick={() => setPreviewRevision(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <textarea
              className="min-h-80 w-full rounded-md border bg-muted p-4 font-mono text-xs leading-relaxed"
              value={editablePayload}
              onChange={(event) => setEditablePayload(event.target.value)}
            />
          </div>
        ) : null}

        {historyData ? (
          <JsonPanel
            title="History / Audit Log"
            data={historyData}
            onClose={() => setHistoryData(null)}
          />
        ) : null}
      </div>
    </RequirePermission>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function JsonPanel({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
