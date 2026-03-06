"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, User, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreateCampaignDialog } from "@/components/create-campaign-dialog";
import { signout } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  isAdmin: boolean;
  isGmOrAdmin: boolean;
};

function NavLinks({
  isAdmin,
  isGmOrAdmin,
  onNavigate,
  className,
}: {
  isAdmin: boolean;
  isGmOrAdmin: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const linkClass = (path: string) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      pathname === path
        ? "bg-barber-gold/20 text-barber-gold"
        : "text-barber-paper/80 hover:bg-barber-gold/10 hover:text-barber-gold"
    );

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      <Link href="/dashboard" onClick={onNavigate} className={linkClass("/dashboard")}>
        <LayoutDashboard className="h-5 w-5 shrink-0" />
        Dashboard
      </Link>
      <Link href="/profile" onClick={onNavigate} className={linkClass("/profile")}>
        <User className="h-5 w-5 shrink-0" />
        Profilo
      </Link>
      {isAdmin && (
        <Link href="/admin" onClick={onNavigate} className={linkClass("/admin")}>
          <Shield className="h-5 w-5 shrink-0" />
          Admin Panel
        </Link>
      )}
      {isGmOrAdmin && (
        <div className="px-3 py-2" onClick={onNavigate}>
          <CreateCampaignDialog />
        </div>
      )}
      <form action={signout} className="mt-auto pt-4">
        <Button
          type="submit"
          variant="ghost"
          className="w-full justify-start gap-3 border border-barber-red/40 text-barber-paper/90 hover:bg-barber-red/10 hover:text-barber-paper"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Esci
        </Button>
      </form>
    </nav>
  );
}

export function DashboardShell({ children, isAdmin, isGmOrAdmin }: DashboardShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      {/* Sidebar desktop: nascosta su mobile, visibile da md */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-barber-gold/20 bg-barber-dark/50 md:flex md:flex-col">
        <div className="flex flex-col gap-1 p-4">
          <NavLinks isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} />
        </div>
      </aside>

      {/* Mobile: hamburger + Sheet */}
      <div className="flex flex-1 flex-col md:contents">
        <div className="flex items-center gap-2 border-b border-barber-gold/20 bg-barber-dark/80 px-4 py-3 md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold"
                aria-label="Apri menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[min(100vw-2rem,280px)] border-barber-gold/20 bg-barber-dark p-0"
            >
              <div className="flex flex-col gap-1 pt-14 pb-4 px-4">
                <NavLinks
                  isAdmin={isAdmin}
                  isGmOrAdmin={isGmOrAdmin}
                  onNavigate={() => setSheetOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium text-barber-paper/90 truncate">Menu</span>
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
