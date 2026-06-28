import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function DashboardPage() {
  return (
    <RequirePermission permission={Permission.DashboardView}>
      <div>
        <PageHeader
          title="Dashboard"
          description="Admin overview with RBAC-aware navigation and widgets."
        />
        <DashboardSummary />
      </div>
    </RequirePermission>
  );
}
