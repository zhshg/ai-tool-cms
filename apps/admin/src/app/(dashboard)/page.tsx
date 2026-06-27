import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="管理后台概览" />
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">欢迎使用 AI Tool CMS 管理后台。</p>
      </div>
    </div>
  );
}
