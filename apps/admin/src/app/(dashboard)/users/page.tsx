"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  fetchUsers,
  fetchUsersSummary,
  getApiErrorMessage,
  type AdminUser,
  type ApiError,
  type UsersSummary,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

export default function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<UsersSummary | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchUsersSummary()])
      .then(([users, usersSummary]) => {
        setItems(users.items);
        setSummary(usersSummary);
      })
      .catch((err: ApiError) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <RequirePermission permission={Permission.UsersManage}>
      <div>
        <PageHeader title="Users" description="Manage users, roles, and permissions." />

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Total users</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.total ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.active ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.inactive ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Roles</p>
            <p className="mt-2 text-2xl font-semibold">{summary?.roles ?? 0}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading users...</p> : null}
          {error ? (
            <p className="p-6 text-sm text-destructive">
              API error {error.status}: {getApiErrorMessage(error)}
            </p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users found.</p>
          ) : null}
          {!isLoading && !error && items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.displayName || user.email}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">{user.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.roles.map((role) => role.name).join(", ") || "None"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </RequirePermission>
  );
}
