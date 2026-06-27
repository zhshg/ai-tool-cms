import { PageHeader } from "@/components/layout/page-header";

export default function UsersPage() {
  return (
    <div>
      <PageHeader title="Users" description="用户与权限管理" />
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">用户管理模块即将上线。</p>
      </div>
    </div>
  );
}
