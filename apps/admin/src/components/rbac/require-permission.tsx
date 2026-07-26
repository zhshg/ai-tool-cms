"use client";

import type { ReactNode } from "react";
import type { PermissionCode } from "@/lib/permissions";
import { useAuth } from "./auth-provider";

type RequirePermissionProps = {
  permission: PermissionCode;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { hasPermission, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return (
      fallback ?? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-card-foreground shadow-sm">
          <h2 className="text-lg font-semibold">Unauthorized</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please sign in to access this page.</p>
        </div>
      )
    );
  }

  if (!hasPermission(permission)) {
    return (
      fallback ?? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-card-foreground shadow-sm">
          <h2 className="text-lg font-semibold">Access denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
