"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { dashboardNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        P
      </span>
      {!compact && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            PostPilot
          </span>
          <span className="text-[11px] text-muted-foreground">Social Poster</span>
        </div>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {dashboardNavItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <div className="flex flex-1 flex-col gap-6 py-5">
        <NavLinks />
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2">
          <div>
            <p className="text-xs font-medium text-foreground">Theme</p>
            <p className="text-[11px] text-muted-foreground">Light or dark</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function MobileSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>
      <div className="flex-1 py-5">
        <NavLinks onNavigate={onNavigate} />
      </div>
    </div>
  );
}
