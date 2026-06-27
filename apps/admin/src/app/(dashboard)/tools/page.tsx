import { PageHeader } from "@/components/layout/page-header";

export default function ToolsPage() {
  return (
    <div>
      <PageHeader title="Tools" description="AI 工具管理" />
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">工具管理模块即将上线。</p>
      </div>
    </div>
  );
}
