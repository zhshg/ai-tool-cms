import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function ToolsLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale="en" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 border-b pb-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-10 w-full max-w-2xl rounded bg-muted" />
            <div className="h-5 w-full max-w-xl rounded bg-muted" />
          </div>
          <div className="h-24 rounded-lg border bg-muted/40" />
        </div>
        <div className="mt-6 h-16 rounded-lg border bg-muted/30" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 rounded-lg border bg-muted/30" />
          ))}
        </div>
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
