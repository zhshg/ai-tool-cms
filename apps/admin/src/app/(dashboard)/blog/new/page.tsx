"use client";

import { BlogArticleEditor } from "@/components/blog/blog-article-editor";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import { Permission } from "@/lib/permissions";

export default function NewBlogArticlePage() {
  return <RequirePermission permission={Permission.SeoManage}><div className="space-y-6"><PageHeader title="New Blog Article" description="Create a Markdown article with SEO and publishing controls." /><BlogArticleEditor mode="create" /></div></RequirePermission>;
}