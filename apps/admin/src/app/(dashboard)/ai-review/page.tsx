"use client";

import { useState } from "react";
import { Bot, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

type ReviewTab = "PENDING" | "APPROVED" | "REJECTED";

const tabs: { key: ReviewTab; label: string; icon: typeof Bot }[] = [
  { key: "PENDING", label: "Pending", icon: Bot },
  { key: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { key: "REJECTED", label: "Rejected", icon: XCircle },
];

export default function AiReviewPage() {
  const [activeTab, setActiveTab] = useState<ReviewTab>("PENDING");

  return (
    <RequirePermission permission={Permission.AiRead}>
      <div>
        <PageHeader
          title="AI Review"
          description="Sprint 4 默认全自动：爬虫 → AI 生成 → 质量评分 → 自动发布。人工审核为可选（AI_PIPELINE_AUTO_PUBLISH=false）。"
        />

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

        <div className="mt-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Content Revisions — {activeTab}</h2>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            当前视图：<strong>{activeTab}</strong>。API 端点：
            <code className="ml-1 text-xs">GET /v1/ai/revisions?status={activeTab}</code>
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">审批</dt>
              <dd className="font-medium">POST /v1/ai/revisions/:id/approve</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">拒绝</dt>
              <dd className="font-medium">POST /v1/ai/revisions/:id/reject</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">重新 AI</dt>
              <dd className="font-medium">POST /v1/ai/tools/:toolId/regenerate</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">自动发布</dt>
              <dd className="font-medium">
                AI_PIPELINE_AUTO_PUBLISH=true（默认）→ Tool.status=PUBLISHED
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pipeline</dt>
              <dd className="font-medium">
                Crawler → Normalize → Summary → Feature → FAQ → SEO → GEO → Quality → Publish
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">质量门控</dt>
              <dd className="font-medium">评分低于 80 自动从 Summary 重试（最多 3 次）</dd>
            </div>
          </dl>
        </div>
      </div>
    </RequirePermission>
  );
}
