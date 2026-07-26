"use client";

import { useParams } from "next/navigation";
import { BlogArticleEditor } from "@/components/blog/blog-article-editor";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function EditBlogArticlePage() {
  const params = useParams<{ id: string }>();
  const articleId = typeof params?.id === "string" ? params.id : "";
  return <RequirePermission permission={Permission.SeoManage}><div className="space-y-6"><PageHeader title="Edit Blog Article" description="Update Markdown, scheduling, cover image, taxonomy, and SEO." /><BlogArticleEditor mode="edit" articleId={articleId} /></div></RequirePermission>;
}