"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bot,
  FileText,
  Globe,
  Link2,
  Mail,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";
import {
  fetchAutomationCenter,
  triggerAutomationBootstrap,
  triggerAutomationDaily,
  triggerAutomationDiscovery,
  triggerAutomationIndex,
  triggerAutomationSocial,
  triggerAutomationWeekly,
  type AutomationCenterResponse,
  type AutomationQueueStats,
  type ApiError,
} from "@/lib/api";

type ActionState = {
  loading: boolean;
  message: string;
  error: boolean;
};

const INITIAL_ACTION: ActionState = { loading: false, message: "", error: false };

export default function AutomationPage() {
  const [data, setData] = useState<AutomationCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState>(INITIAL_ACTION);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAutomationCenter();
      setData(result);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setAction({ loading: true, message: `正在执行：${label}...`, error: false });
      try {
        const result = (await fn()) as Record<string, unknown>;
        const summary = Object.entries(result)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : v}`)
          .join("， ");
        setAction({ loading: false, message: `${label} 完成 — ${summary}`, error: false });
        // 刷新数据
        await loadData();
      } catch (err) {
        const apiErr = err as ApiError;
        setAction({ loading: false, message: `${label} 失败：${apiErr.message}`, error: true });
      }
    },
    [loadData],
  );

  return (
    <RequirePermission permission={Permission.AutomationRead}>
      <div>
        <PageHeader
          title="Automation Center"
          description="无人运营中枢：Discovery、Crawler、AI、SEO、Publish、Email、Social、Queue — 每日自动运行。"
        />

        {/* 操作按钮区 */}
        <div className="mb-6 flex flex-wrap gap-2">
          <ActionButton
            label="刷新数据"
            icon={RefreshCw}
            onClick={loadData}
            disabled={loading}
            variant="secondary"
          />
          <ActionButton
            label="启动自动化"
            icon={Zap}
            onClick={() => void runAction("启动自动化", triggerAutomationBootstrap)}
            disabled={action.loading}
          />
          <ActionButton
            label="执行每日流程"
            icon={Play}
            onClick={() => void runAction("每日流程", triggerAutomationDaily)}
            disabled={action.loading}
          />
          <ActionButton
            label="执行每周流程"
            icon={Mail}
            onClick={() => void runAction("每周流程", triggerAutomationWeekly)}
            disabled={action.loading}
          />
          <ActionButton
            label="触发发现源"
            icon={Sparkles}
            onClick={() => void runAction("发现源", triggerAutomationDiscovery)}
            disabled={action.loading}
          />
          <ActionButton
            label="社交发帖"
            icon={Globe}
            onClick={() => void runAction("社交发帖", () => triggerAutomationSocial("WEEKLY_AI"))}
            disabled={action.loading}
          />
          <ActionButton
            label="搜索引擎收录"
            icon={Search}
            onClick={() => void runAction("搜索引擎收录", triggerAutomationIndex)}
            disabled={action.loading}
          />
          <Link
            href="/automation/logs"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5" />
            运行日志
          </Link>
        </div>

        {/* 操作状态提示 */}
        {action.message && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              action.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {action.loading && <RefreshCw className="mr-2 inline h-3 w-3 animate-spin" />}
            {action.message}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            加载失败：{error}
          </div>
        )}

        {/* 加载状态 */}
        {loading && !data && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            正在加载自动化指标...
          </div>
        )}

        {/* 指标卡片 */}
        {data && (
          <>
            {/* 发现源 */}
            <SectionTitle icon={Sparkles} title="发现源 (Discovery)" commit="081" />
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="源总数" value={data.discovery.sourcesTotal} icon={Sparkles} />
              <MetricCard label="已启用" value={data.discovery.sourcesEnabled} icon={Activity} />
              <MetricCard label="待处理任务" value={data.discovery.tasksPending} icon={Play} />
              <MetricCard label="新结果" value={data.discovery.resultsNew} icon={Bot} />
            </div>

            {/* 监控器 */}
            <SectionTitle icon={Link2} title="监控器 (Monitors)" commit="082-085" />
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="网站监控" value={data.monitors.websiteActive} icon={Globe} />
              <MetricCard label="价格监控" value={data.monitors.priceActive} icon={Activity} />
              <MetricCard
                label="失效链接(7天)"
                value={data.monitors.brokenLinksOpen}
                icon={Link2}
              />
              <MetricCard label="AI刷新到期" value={data.monitors.aiRefreshDue} icon={Bot} />
            </div>

            {/* 发布与收录 */}
            <SectionTitle icon={Search} title="发布与收录 (Publish & Index)" commit="086-090" />
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="社交帖子待发" value={data.monitors.socialScheduled} icon={Globe} />
              <MetricCard label="收录待提交" value={data.monitors.indexPending} icon={Search} />
            </div>

            {/* 队列概览 */}
            <SectionTitle icon={Activity} title="队列概览 (Queues)" commit="081-090" />
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <QueueCard title="Automation 队列" queues={data.queues.automation} />
              <QueueCard title="AI 队列" queues={data.queues.ai} />
              <QueueCard title="Growth 队列" queues={data.queues.growth} />
              <QueueCard title="Platform 队列" queues={data.queues.platform} />
            </div>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <SimpleMetric label="Crawl 队列数" value={data.queues.crawl} />
              <SimpleMetric label="Search 队列" value={sumQueueTotal(data.queues.search)} />
              <SimpleMetric label="I18n 队列数" value={data.queues.i18n} />
            </div>

            {/* 最近运行记录 */}
            <SectionTitle icon={Activity} title="最近运行记录 (Recent Runs)" commit="" />
            <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
              {data.recentRuns.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  暂无运行记录，点击上方按钮手动触发。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4">类型</th>
                        <th className="pb-2 pr-4">状态</th>
                        <th className="pb-2 pr-4">时间</th>
                        <th className="pb-2">错误</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRuns.slice(0, 10).map((run) => (
                        <tr key={run.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{run.kind}</td>
                          <td className="py-2 pr-4">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {formatTime(run.createdAt)}
                          </td>
                          <td className="py-2 text-xs text-red-600">{run.errorMessage ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 每日自动流程图 */}
            <SectionTitle icon={Play} title="每日自动流程" commit="" />
            <div className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Internet → Discovery → Crawler → Change Detection → AI Rewrite → SEO/GEO → Publish →
                Index → Social → Newsletter
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Scheduler 每 60 秒轮询，每 24 小时自动执行一次 daily poll，每周一执行 weekly poll。
              </p>
            </div>

            {/* MCP Server 信息 */}
            <SectionTitle icon={Bot} title="MCP Server — AI Native Interface" commit="" />
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">
                ChatGPT、Claude Desktop、Cursor、Windsurf、Cherry Studio 可通过 MCP 直接连接 AI Tool
                CMS。
              </p>
              <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
                <li>search_ai_tools — AI 工具搜索</li>
                <li>get_tool_details — 工具详情</li>
                <li>compare_tools — 工具对比</li>
                <li>search_categories — 分类搜索</li>
                <li>query_pricing — 定价查询</li>
                <li>latest_ai_tools — 最新 / 热门工具</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                启动：<code>pnpm --filter @ai-tool-cms/mcp-server start</code>
              </p>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}

// ============ 子组件 ============

function SectionTitle({
  icon: Icon,
  title,
  commit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  commit: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-medium">{title}</h2>
      {commit && <span className="text-xs text-muted-foreground">Commit {commit}</span>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function SimpleMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QueueCard({
  title,
  queues,
}: {
  title: string;
  queues: Record<string, AutomationQueueStats>;
}) {
  const entries = Object.entries(queues);
  const totalWaiting = entries.reduce((sum, [, s]) => sum + s.waiting, 0);
  const totalActive = entries.reduce((sum, [, s]) => sum + s.active, 0);
  const totalFailed = entries.reduce((sum, [, s]) => sum + s.failed, 0);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-medium">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">无队列数据</p>
      ) : (
        <>
          <div className="mt-2 flex gap-4 text-xs">
            <span className="text-yellow-600">等待: {totalWaiting}</span>
            <span className="text-blue-600">活跃: {totalActive}</span>
            <span className="text-red-600">失败: {totalFailed}</span>
          </div>
          <div className="mt-3 space-y-1">
            {entries.slice(0, 5).map(([name, stats]) => (
              <div key={name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{name}</span>
                <span>
                  <span className="text-yellow-600">{stats.waiting}</span>
                  {" / "}
                  <span className="text-blue-600">{stats.active}</span>
                  {" / "}
                  <span className="text-red-600">{stats.failed}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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
          : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "secondary"
      ? "border border-border bg-background hover:bg-muted"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ============ 工具函数 ============

function sumQueueTotal(queues: Record<string, AutomationQueueStats>): number {
  return Object.values(queues).reduce((sum, s) => sum + s.total, 0);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
