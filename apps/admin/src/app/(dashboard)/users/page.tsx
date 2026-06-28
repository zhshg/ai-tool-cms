import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function UsersPage() {
  return (
    <RequirePermission permission={Permission.UsersManage}>
      <div>
        <PageHeader title="Users" description="Manage users, roles, and permissions." />
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Users module coming soon.</p>
        </div>
      </div>
    </RequirePermission>
  );
}
