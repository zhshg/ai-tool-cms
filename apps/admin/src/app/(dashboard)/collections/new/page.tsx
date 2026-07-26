"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { CollectionEditorForm } from "@/components/collections/collection-editor-form";
import { Permission } from "@/lib/permissions";

export default function NewCollectionPage() {
  return (
    <RequirePermission permission={Permission.SeoManage}>
      <div className="space-y-6">
        <PageHeader title="New Collection" description="Create a curated AI tool landing page." />
        <CollectionEditorForm mode="create" />
      </div>
    </RequirePermission>
  );
}
