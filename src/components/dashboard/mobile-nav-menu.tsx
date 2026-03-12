"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, User, UserCog, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreateCampaignDialog } from "@/components/create-campaign-dialog";
import { signout } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

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
      <Link href="/dashboard/settings/profile" onClick={onNavigate} className={linkClass("/dashboard/settings/profile")}>
        <UserCog className="h-5 w-5 shrink-0" />
        {isGmOrAdmin ? "Profilo pubblico GM" : "Profilo giocatore"}
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

type MobileNavMenuProps = {
  isAdmin: boolean;
  isGmOrAdmin: boolean;
  /** Se true, il trigger è solo l'icona (per inserirlo in header custom). Altrimenti mostra anche "Menu". */
  iconOnly?: boolean;
  className?: string;
};

export function MobileNavMenu({ isAdmin, isGmOrAdmin, iconOnly = false, className }: MobileNavMenuProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold",
            className
          )}
          aria-label="Apri menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(100vw-2rem,280px)] border-barber-gold/20 bg-barber-dark p-0"
      >
        <div className="flex flex-col gap-1 px-4 pb-4 pt-14">
          <NavLinks
            isAdmin={isAdmin}
            isGmOrAdmin={isGmOrAdmin}
            onNavigate={() => setSheetOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
