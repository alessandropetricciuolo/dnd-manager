"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, User, Shield, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNavMenu } from "@/components/dashboard/mobile-nav-menu";
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

  const isCampaignDetail = pathname?.match(/^\/campaigns\/[^/]+$/);

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {isCampaignDetail && (
        <Link href="/dashboard" onClick={onNavigate} className={linkClass("/dashboard")}>
          <ArrowLeft className="h-5 w-5 shrink-0" />
          Indietro
        </Link>
      )}
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
  const pathname = usePathname();
  const isCampaignPage = pathname?.startsWith("/campaigns");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      {/* Sidebar desktop: nascosta su mobile, visibile da md */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-barber-gold/20 bg-barber-dark/50 md:flex md:flex-col">
        <div className="flex flex-col gap-1 p-4">
          <NavLinks isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} />
        </div>
      </aside>

      {/* Mobile: hamburger (nascosto nelle campagne: la pagina campagna ha il suo hamburger) */}
      <div className="flex flex-1 flex-col md:contents">
        {!isCampaignPage && (
          <div className="flex items-center gap-2 border-b border-barber-gold/20 bg-barber-dark/80 px-4 py-3 md:hidden">
            <MobileNavMenu isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} />
            <span className="text-sm font-medium text-barber-paper/90 truncate">Menu</span>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
