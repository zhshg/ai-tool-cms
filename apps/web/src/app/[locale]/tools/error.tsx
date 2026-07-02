"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function ToolsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale="en" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-16 sm:px-6">
        <section className="w-full rounded-lg border border-destructive/30 bg-card p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-destructive">
            Directory unavailable
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Unable to load AI tools</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The directory data could not be loaded. Retry the request after the data service is
            available.
          </p>
          <Button type="button" className="mt-6" onClick={() => reset()}>
            <RotateCcw />
            Retry
          </Button>
        </section>
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
