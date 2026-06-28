"use client";

import { FolderTree, Users, Wrench } from "lucide-react";
import { usePermissions } from "@/components/rbac/auth-provider";

const stats = [
  { label: "Tools", value: "—", icon: Wrench, visible: (p: ReturnType<typeof usePermissions>) => p.canReadTools },
  { label: "Categories", value: "—", icon: FolderTree, visible: (p: ReturnType<typeof usePermissions>) => p.canReadCategories },
  { label: "Users", value: "—", icon: Users, visible: (p: ReturnType<typeof usePermissions>) => p.canManageUsers },
];

export function DashboardSummary() {
  const permissions = usePermissions();
  const visibleStats = stats.filter((stat) => stat.visible(permissions));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-sm font-medium">RBAC session</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">User</dt>
            <dd className="font-medium">{permissions.user.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium">{permissions.user.roles.join(", ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Permissions</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {permissions.user.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {permission}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
