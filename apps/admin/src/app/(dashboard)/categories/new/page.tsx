"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { CategoryEditorForm } from "@/components/categories/category-editor-form";
import { Permission } from "@/lib/permissions";

export default function NewCategoryPage() {
  return (
    <RequirePermission permission={Permission.CategoriesRead}>
      <div className="space-y-6">
        <PageHeader title="New Category" description="Create a new taxonomy category." />
        <CategoryEditorForm mode="create" />
      </div>
    </RequirePermission>
  );
}
