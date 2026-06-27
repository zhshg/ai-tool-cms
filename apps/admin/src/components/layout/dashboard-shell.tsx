import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <AppSidebar />
      </div>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <SiteHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
