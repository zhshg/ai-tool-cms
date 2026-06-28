"use client";

import { Activity, Bot, Globe, Link2, Mail, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

const modules = [
  { key: "discovery", label: "Discovery", icon: Sparkles, commit: "081" },
  { key: "crawler", label: "Crawler", icon: Activity, commit: "082" },
  { key: "ai", label: "AI Refresh", icon: Bot, commit: "086" },
  { key: "seo", label: "SEO / Index", icon: Search, commit: "089" },
  { key: "social", label: "Social", icon: Globe, commit: "087" },
  { key: "email", label: "Newsletter", icon: Mail, commit: "088" },
  { key: "monitor", label: "Monitors", icon: Link2, commit: "082–085" },
] as const;

export default function AutomationPage() {
  return (
    <RequirePermission permission={Permission.AutomationRead}>
      <div>
        <PageHeader
          title="Automation Center"
          description="无人运营中枢：Discovery、Crawler、AI、SEO、Publish、Email、Social、Queue — Commits 081–090。"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <div key={module.key} className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{module.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">—</p>
                <p className="mt-1 text-xs text-muted-foreground">Commit {module.commit}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">Queue 概览</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              automation-discovery-run、website-monitor、price-monitor、screenshot-capture、link-check、ai-refresh、social-post、newsletter-auto、index-submit
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-medium">每日自动流程</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Internet → Discovery → Crawler → Change Detection → AI Rewrite → SEO/GEO → Publish →
              Index → Social → Newsletter
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium">MCP Server — AI Native Interface</h2>
          <p className="mt-2 text-sm text-muted-foreground">
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
          <p className="mt-1 text-sm text-muted-foreground">
            <code>GET /v1/automation/mcp</code>
          </p>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            <code>GET /v1/automation/center</code> · <code>GET /v1/automation/discovery</code> ·{" "}
            <code>POST /v1/automation/daily</code>
          </p>
        </div>
      </div>
    </RequirePermission>
  );
}
