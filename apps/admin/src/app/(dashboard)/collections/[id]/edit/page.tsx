"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { CollectionEditorForm } from "@/components/collections/collection-editor-form";
import { Permission } from "@/lib/permissions";

export default function EditCollectionPage() {
  const params = useParams<{ id: string }>();
  const collectionId = typeof params?.id === "string" ? params.id : "";

  return (
    <RequirePermission permission={Permission.SeoManage}>
      <div className="space-y-6">
        <PageHeader
          title="Edit Collection"
          description="Update collection tools, SEO, sorting, and publishing."
        />
        <CollectionEditorForm mode="edit" collectionId={collectionId} />
      </div>
    </RequirePermission>
  );
}
