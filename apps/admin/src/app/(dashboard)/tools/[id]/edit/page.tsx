"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { ToolEditorForm } from "@/components/tools/tool-editor-form";
import { Permission } from "@/lib/permissions";

export default function EditToolPage() {
  const params = useParams<{ id: string }>();
  const toolId = typeof params?.id === "string" ? params.id : "";

  return (
    <RequirePermission permission={Permission.ToolsRead}>
      <div className="space-y-6">
        <PageHeader
          title="Edit Tool"
          description="Update tool content, taxonomy, and SEO fields."
        />
        <ToolEditorForm mode="edit" toolId={toolId} />
      </div>
    </RequirePermission>
  );
}
