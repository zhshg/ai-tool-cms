import { PageHeader } from "@/components/layout/page-header";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="系统设置" />
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">系统设置模块即将上线。</p>
      </div>
    </div>
  );
}
