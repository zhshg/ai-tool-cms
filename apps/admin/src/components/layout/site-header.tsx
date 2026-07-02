"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/rbac/auth-provider";
import { getAdminBasePath } from "@/lib/api";

export function SiteHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const adminBasePath = getAdminBasePath();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <AppSidebar className="border-0" />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1 overflow-hidden">
        <AppBreadcrumb />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user?.name ?? "Guest"}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Sign out"
          onClick={() => {
            logout();
            router.replace(`${adminBasePath}/login`);
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
