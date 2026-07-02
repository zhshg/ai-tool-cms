"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/rbac/auth-provider";
import { getAdminLoginPath } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type AppSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { navItems, user, logout } = useAuth();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm text-sidebar-primary-foreground">
            AI
          </span>
          <span>Tool CMS</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="space-y-1 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{user?.name ?? "Guest"}</p>
        <p>{user?.email ?? "Not signed in"}</p>
        <p>Role: {user?.roles.join(", ") ?? "-"}</p>
        <button
          type="button"
          className="pt-2 text-left text-xs font-medium text-primary"
          onClick={() => {
            logout();
            router.replace(getAdminLoginPath());
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
