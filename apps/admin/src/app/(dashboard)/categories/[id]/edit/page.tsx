"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { CategoryEditorForm } from "@/components/categories/category-editor-form";
import { Permission } from "@/lib/permissions";

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const categoryId = typeof params?.id === "string" ? params.id : "";

  return (
    <RequirePermission permission={Permission.CategoriesUpdate}>
      <div className="space-y-6">
        <PageHeader title="Edit Category" description="Update taxonomy structure and metadata." />
        <CategoryEditorForm mode="edit" categoryId={categoryId} />
      </div>
    </RequirePermission>
  );
}
