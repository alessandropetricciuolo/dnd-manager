"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Landmark, LayoutDashboard, Shield, Wallet, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type VaultShellProps = {
  children: React.ReactNode;
  isAdmin: boolean;
};

const PRIMARY_NAV = [
  { href: "/vault", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/vault/conti", label: "Conti", icon: Wallet },
] as const;

const DESKTOP_NAV = [
  { href: "/vault", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/vault/conti", label: "Conti", icon: Wallet },
] as const;

function isNavActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname?.startsWith(href);
}

export function VaultShell({ children, isAdmin }: VaultShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-barber-dark text-barber-paper">
      <header className="sticky top-0 z-30 border-b border-barber-gold/25 bg-barber-dark/95 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href="/dashboard" className="shrink-0">
            <Button variant="ghost" size="sm" className="h-10 px-2 text-barber-paper/80 hover:text-barber-gold sm:px-3">
              <ArrowLeft className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-barber-gold">
            <Landmark className="h-5 w-5 shrink-0" />
            <span className="truncate text-base font-semibold sm:text-lg">Il Vault</span>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:flex">
          {DESKTOP_NAV.map((item) => {
            const active = isNavActive(pathname ?? "", item.href, "exact" in item && item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-barber-gold/20 text-barber-gold"
                    : "text-barber-paper/75 hover:bg-barber-gold/10 hover:text-barber-gold"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/vault/accessi"
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname?.startsWith("/vault/accessi")
                  ? "bg-barber-gold/20 text-barber-gold"
                  : "text-barber-paper/75 hover:bg-barber-gold/10 hover:text-barber-gold"
              )}
            >
              <Shield className="h-4 w-4" />
              Accessi
            </Link>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-4 sm:py-6 md:pb-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-barber-gold/25 bg-barber-dark/98 backdrop-blur md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-0.5 px-1 py-1">
          {PRIMARY_NAV.map((item) => {
            const active = isNavActive(pathname ?? "", item.href, "exact" in item && item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium",
                  active ? "text-barber-gold" : "text-barber-paper/65"
                )}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", active && "bg-barber-gold/15")}>
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium",
                    pathname?.startsWith("/vault/accessi") ? "text-barber-gold" : "text-barber-paper/65"
                  )}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", pathname?.startsWith("/vault/accessi") && "bg-barber-gold/15")}>
                    <Menu className="h-4 w-4" />
                  </span>
                  Altro
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                <SheetHeader>
                  <SheetTitle className="text-barber-gold">Altre sezioni</SheetTitle>
                </SheetHeader>
                <Link
                  href="/vault/accessi"
                  onClick={() => setMoreOpen(false)}
                  className="mt-4 flex items-center gap-3 rounded-lg border border-barber-gold/20 px-4 py-3 text-sm font-medium"
                >
                  <Shield className="h-5 w-5 text-barber-gold" />
                  Accessi GM
                </Link>
              </SheetContent>
            </Sheet>
          ) : (
            <div />
          )}
        </div>
      </nav>
    </div>
  );
}
