"use client";

import { UserButton } from "@clerk/nextjs";
import { MenuIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { MobileSidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getPageTitle } from "@/lib/navigation";

export function DashboardHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/70 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
            />
          }
        >
          <MenuIcon className="size-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <MobileSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="hidden md:inline-flex" />

        <Button
          render={<Link href="/create" />}
          nativeButton={false}
          className="hidden sm:inline-flex"
        >
          <PlusIcon />
          New Post
        </Button>

        <Button
          render={<Link href="/create" />}
          nativeButton={false}
          size="icon"
          className="sm:hidden"
          aria-label="New post"
        >
          <PlusIcon className="size-4" />
        </Button>

        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-9",
            },
          }}
        />
      </div>
    </header>
  );
}
