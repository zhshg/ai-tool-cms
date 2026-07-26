"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { ToolEditorForm } from "@/components/tools/tool-editor-form";
import { Permission } from "@/lib/permissions";

export default function NewToolPage() {
  return (
    <RequirePermission permission={Permission.ToolsCreate}>
      <div className="space-y-6">
        <PageHeader title="New Tool" description="Create a new tool entry for the directory." />
        <ToolEditorForm mode="create" />
      </div>
    </RequirePermission>
  );
}
