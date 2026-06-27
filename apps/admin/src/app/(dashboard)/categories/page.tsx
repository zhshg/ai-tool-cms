import { PageHeader } from "@/components/layout/page-header";

export default function CategoriesPage() {
  return (
    <div>
      <PageHeader title="Categories" description="分类管理" />
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">分类管理模块即将上线。</p>
      </div>
    </div>
  );
}
