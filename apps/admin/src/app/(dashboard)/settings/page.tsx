import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function SettingsPage() {
  return (
    <RequirePermission permission={Permission.SettingsRead}>
      <div>
        <PageHeader title="Settings" description="System configuration." />
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Settings module coming soon.</p>
        </div>
      </div>
    </RequirePermission>
  );
}
