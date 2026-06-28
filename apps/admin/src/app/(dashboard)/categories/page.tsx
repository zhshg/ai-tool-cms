import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function CategoriesPage() {
  return (
    <RequirePermission permission={Permission.CategoriesRead}>
      <div>
        <PageHeader title="Categories" description="Manage taxonomy categories." />
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Categories module coming soon.</p>
        </div>
      </div>
    </RequirePermission>
  );
}
