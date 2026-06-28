import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function ToolsPage() {
  return (
    <RequirePermission permission={Permission.ToolsRead}>
      <div>
        <PageHeader title="Tools" description="Manage AI tools catalog." />
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Tools module coming soon.</p>
        </div>
      </div>
    </RequirePermission>
  );
}
