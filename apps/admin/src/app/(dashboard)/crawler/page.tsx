"use client";

import {
  Activity,
  CheckCircle2,
  Clock3,
  Layers,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const metrics = [
  { key: "todayCrawl", label: "今日采集", icon: Activity },
  { key: "success", label: "成功", icon: CheckCircle2 },
  { key: "failed", label: "失败", icon: XCircle },
  { key: "pending", label: "待处理", icon: Clock3 },
  { key: "queueTotal", label: "队列任务", icon: Layers },
  { key: "averageTimeMs", label: "平均耗时 (ms)", icon: RefreshCw },
  { key: "newTools", label: "新增工具", icon: PlusCircle },
  { key: "updatedTools", label: "更新工具", icon: RefreshCw },
] as const;

export default function CrawlerPage() {
  return (
    <RequirePermission permission={Permission.CrawlerRead}>
      <div>
        <PageHeader title="Crawler" description="采集源注册表、队列与今日采集概览。" />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.key}
                className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">—</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="text-sm font-medium">Framework 验证</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sprint 3 策略：先用 Mock Adapter（本地 fixtures）验证采集 → 规范化 → 去重 → 入库全链路。
            真实数据源在框架稳定后通过{" "}
            <code className="text-xs">registerProductionSiteAdapters()</code> 按需启用。
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">默认适配器</dt>
              <dd className="font-medium">mock（本地 fixtures）</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">队列</dt>
              <dd className="font-medium">
                crawl-tool · crawl-category · crawl-detail · crawl-image · normalize
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">调度</dt>
              <dd className="font-medium">Hourly · Daily · Weekly · Manual</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dashboard API</dt>
              <dd className="font-medium">GET /v1/crawler/dashboard</dd>
            </div>
          </dl>
        </div>
      </div>
    </RequirePermission>
  );
}
