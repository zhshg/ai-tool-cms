"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";
import {
  fetchAutomationRun,
  fetchAutomationRuns,
  type AutomationRunDetail,
  type AutomationRunItem,
  type ApiError,
} from "@/lib/api";

const RUN_KIND_LABELS: Record<string, string> = {
  DISCOVERY: "发现源",
  WEBSITE_MONITOR: "网站监控",
  PRICE_MONITOR: "价格监控",
  SCREENSHOT: "截图采集",
  LINK_CHECK: "链接检查",
  AI_REFRESH: "AI内容刷新",
  SOCIAL_POST: "社交发帖",
  NEWSLETTER: "邮件通讯",
  INDEX_SUBMIT: "搜索引擎收录",
};

const KIND_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "DISCOVERY", label: "发现源" },
  { value: "WEBSITE_MONITOR", label: "网站监控" },
  { value: "PRICE_MONITOR", label: "价格监控" },
  { value: "SCREENSHOT", label: "截图采集" },
  { value: "LINK_CHECK", label: "链接检查" },
  { value: "AI_REFRESH", label: "AI内容刷新" },
  { value: "SOCIAL_POST", label: "社交发帖" },
  { value: "NEWSLETTER", label: "邮件通讯" },
  { value: "INDEX_SUBMIT", label: "搜索引擎收录" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "PENDING", label: "等待中" },
  { value: "RUNNING", label: "运行中" },
  { value: "COMPLETED", label: "已完成" },
  { value: "FAILED", label: "失败" },
];

export default function AutomationLogsPage() {
  const [items, setItems] = useState<AutomationRunItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AutomationRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAutomationRuns({
        page,
        pageSize,
        kind: kind || undefined,
        status: status || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, kind, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDetail = useCallback(async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const result = await fetchAutomationRun(id);
      setDetail(result);
    } catch (err) {
      const apiErr = err as ApiError;
      setDetail({
        id,
        kind: "",
        status: "",
        referenceId: null,
        startedAt: null,
        finishedAt: null,
        errorMessage: apiErr.message,
        result: {},
        metadata: {},
        createdAt: "",
        updatedAt: "",
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <RequirePermission permission={Permission.AutomationRead}>
      <div>
        <PageHeader
          title="自动化运行日志"
          description="查看所有自动化任务的运行记录，支持按类型和状态筛选。"
        />

        {/* 筛选栏 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            加载失败：{error}
          </div>
        )}

        {/* 日志列表 */}
        <div className="rounded-lg border bg-card shadow-sm">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              正在加载日志...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无运行记录
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">类型</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">开始时间</th>
                      <th className="px-4 py-3">结束时间</th>
                      <th className="px-4 py-3">耗时</th>
                      <th className="px-4 py-3">错误</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((run) => (
                      <tr key={run.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {RUN_KIND_LABELS[run.kind] || run.kind}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {run.startedAt ? formatTime(run.startedAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {run.finishedAt ? formatTime(run.finishedAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {run.startedAt && run.finishedAt
                            ? formatDuration(run.startedAt, run.finishedAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate text-xs text-red-600">
                          {run.errorMessage ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => void openDetail(run.id)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                          >
                            <Eye className="h-3 w-3" />
                            详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  共 {total} 条，第 {page} / {totalPages} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1 text-xs disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    上一页
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1 text-xs disabled:opacity-50"
                  >
                    下一页
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 详情抽屉 */}
        {detailOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDetailOpen(false)}
            />
            <div className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-background shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b bg-background px-6 py-4">
                <h3 className="text-sm font-medium">运行详情</h3>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    加载详情...
                  </div>
                ) : detail ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">类型</p>
                        <p className="mt-1 font-medium">
                          {RUN_KIND_LABELS[detail.kind] || detail.kind}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">状态</p>
                        <p className="mt-1">
                          <StatusBadge status={detail.status} />
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">开始时间</p>
                        <p className="mt-1">{detail.startedAt ? formatTime(detail.startedAt) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">结束时间</p>
                        <p className="mt-1">{detail.finishedAt ? formatTime(detail.finishedAt) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">耗时</p>
                        <p className="mt-1">
                          {detail.startedAt && detail.finishedAt
                            ? formatDuration(detail.startedAt, detail.finishedAt)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">关联ID</p>
                        <p className="mt-1 font-mono text-xs">{detail.referenceId ?? "—"}</p>
                      </div>
                    </div>

                    {detail.errorMessage && (
                      <div>
                        <p className="text-xs text-muted-foreground">错误信息</p>
                        <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                          {detail.errorMessage}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground">结果 (result)</p>
                      <pre className="mt-1 max-h-80 overflow-auto rounded-md border bg-muted p-3 text-xs">
                        {JSON.stringify(detail.result, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">元数据 (metadata)</p>
                      <pre className="mt-1 max-h-60 overflow-auto rounded-md border bg-muted p-3 text-xs">
                        {JSON.stringify(detail.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "COMPLETED"
      ? "bg-green-100 text-green-700"
      : status === "FAILED"
        ? "bg-red-100 text-red-700"
        : status === "RUNNING"
          ? "bg-blue-100 text-blue-700"
          : status === "PENDING"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-100 text-gray-700";
  const label =
    status === "COMPLETED"
      ? "已完成"
      : status === "FAILED"
        ? "失败"
        : status === "RUNNING"
          ? "运行中"
          : status === "PENDING"
            ? "等待中"
            : status;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diff = end - start;
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60_000) return `${(diff / 1000).toFixed(1)}s`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ${Math.floor((diff % 60_000) / 1000)}s`;
    return `${Math.floor(diff / 3_600_000)}h ${Math.floor((diff % 3_600_000) / 60_000)}m`;
  } catch {
    return "—";
  }
}
