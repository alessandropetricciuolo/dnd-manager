"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, User, UserCog, Shield, LogOut, ArrowLeft } from "lucide-react";
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

const SIDEBAR_LABEL =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover/sidebar:max-w-[11rem] group-hover/sidebar:opacity-100";

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
      "flex h-10 items-center gap-0 rounded-lg text-sm font-medium transition-colors",
      "justify-center px-0 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3",
      pathname === path
        ? "bg-barber-gold/20 text-barber-gold"
        : "text-barber-paper/80 hover:bg-barber-gold/10 hover:text-barber-gold"
    );

  const isCampaignDetail = pathname?.match(/^\/campaigns\/[^/]+$/);

  return (
    <nav className={cn("flex min-h-0 flex-1 flex-col gap-1", className)}>
      {isCampaignDetail && (
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={linkClass("/dashboard")}
          title="Indietro"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          <span className={SIDEBAR_LABEL}>Indietro</span>
        </Link>
      )}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={linkClass("/dashboard")}
        title="Dashboard"
      >
        <LayoutDashboard className="h-5 w-5 shrink-0" />
        <span className={SIDEBAR_LABEL}>Dashboard</span>
      </Link>
      <Link href="/profile" onClick={onNavigate} className={linkClass("/profile")} title="Profilo">
        <User className="h-5 w-5 shrink-0" />
        <span className={SIDEBAR_LABEL}>Profilo</span>
      </Link>
      {isGmOrAdmin && (
        <Link
          href="/dashboard/settings/profile"
          onClick={onNavigate}
          className={linkClass("/dashboard/settings/profile")}
          title="Profilo pubblico GM"
        >
          <UserCog className="h-5 w-5 shrink-0" />
          <span className={SIDEBAR_LABEL}>Profilo pubblico GM</span>
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" onClick={onNavigate} className={linkClass("/admin")} title="Admin Panel">
          <Shield className="h-5 w-5 shrink-0" />
          <span className={SIDEBAR_LABEL}>Admin Panel</span>
        </Link>
      )}
      {isGmOrAdmin && (
        <div
          className="flex justify-center py-0.5 group-hover/sidebar:justify-start group-hover/sidebar:px-1"
          onClick={onNavigate}
        >
          <CreateCampaignDialog collapsibleSidebar />
        </div>
      )}
      <form action={signout} className="mt-auto pt-2">
        <Button
          type="submit"
          variant="ghost"
          title="Esci"
          className={cn(
            "h-10 w-full gap-0 border border-barber-red/40 text-barber-paper/90 hover:bg-barber-red/10 hover:text-barber-paper",
            "justify-center px-0 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={SIDEBAR_LABEL}>Esci</span>
        </Button>
      </form>
    </nav>
  );
}

export function DashboardShell({ children, isAdmin, isGmOrAdmin }: DashboardShellProps) {
  const pathname = usePathname();
  const isCampaignPage = pathname?.startsWith("/campaigns");
  const isGmScreen = pathname?.includes("/gm-screen");
  const isVistaProiezione = pathname?.includes("/vista-dall-alto/proiezione");

  if (isGmScreen || isVistaProiezione) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <aside
        className={cn(
          "group/sidebar relative z-30 hidden shrink-0 flex-col overflow-hidden",
          "border-r border-barber-gold/20 bg-barber-dark/95 backdrop-blur-sm",
          "w-14 transition-[width] duration-200 ease-out hover:w-56",
          "md:flex"
        )}
      >
        <div className="flex h-full min-h-0 flex-col py-3">
          <NavLinks isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} className="px-1.5 group-hover/sidebar:px-2" />
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:contents">
        {!isCampaignPage && (
          <div className="flex items-center gap-2 border-b border-barber-gold/20 bg-barber-dark/80 px-4 py-3 md:hidden">
            <MobileNavMenu isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} />
            <span className="truncate text-sm font-medium text-barber-paper/90">Menu</span>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
