"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Hammer,
  LayoutDashboard,
  Menu,
  Package,
  Shield,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ForgeShellProps = {
  children: React.ReactNode;
  isAdmin: boolean;
};

const PRIMARY_NAV = [
  { href: "/forge", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/forge/prodotti", label: "Prodotti", icon: Package },
  { href: "/forge/vendite/nuova", label: "Vendita", icon: ShoppingCart, highlight: true },
  { href: "/forge/conti", label: "Conti", icon: Wallet },
] as const;

const MORE_NAV = [
  { href: "/forge/magazzino", label: "Magazzino", icon: Boxes },
  { href: "/forge/report", label: "Report", icon: BarChart3 },
] as const;

const DESKTOP_NAV = [
  { href: "/forge", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/forge/prodotti", label: "Prodotti", icon: Package },
  { href: "/forge/vendite/nuova", label: "Nuova vendita", icon: ShoppingCart },
  { href: "/forge/magazzino", label: "Movimenti magazzino", icon: Boxes },
  { href: "/forge/conti", label: "Conti", icon: Wallet },
  { href: "/forge/report", label: "Report incassi", icon: BarChart3 },
] as const;

function isNavActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname?.startsWith(href);
}

export function ForgeShell({ children, isAdmin }: ForgeShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive =
    MORE_NAV.some((item) => isNavActive(pathname ?? "", item.href)) ||
    (isAdmin && pathname?.startsWith("/forge/accessi"));

  return (
    <div className="min-h-[100dvh] bg-barber-dark text-barber-paper">
      <header className="sticky top-0 z-30 border-b border-barber-gold/25 bg-barber-dark/95 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href="/dashboard" className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-2 text-barber-paper/80 hover:text-barber-gold sm:px-3"
            >
              <ArrowLeft className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-barber-gold">
            <Hammer className="h-5 w-5 shrink-0" />
            <span className="truncate text-base font-semibold sm:text-lg">La Forgia</span>
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
              href="/forge/accessi"
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname?.startsWith("/forge/accessi")
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

      <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-4 sm:py-6 md:pb-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-barber-gold/25 bg-barber-dark/98 backdrop-blur md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-1">
          {PRIMARY_NAV.map((item) => {
            const active = isNavActive(pathname ?? "", item.href, "exact" in item && item.exact);
            const Icon = item.icon;
            const isHighlight = "highlight" in item && item.highlight;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium leading-tight transition-colors",
                  active
                    ? "text-barber-gold"
                    : "text-barber-paper/65",
                  isHighlight && !active && "text-barber-gold/80"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    isHighlight
                      ? active
                        ? "bg-barber-gold text-barber-dark"
                        : "bg-barber-gold/20 text-barber-gold"
                      : active
                        ? "bg-barber-gold/15"
                        : ""
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium leading-tight",
                  moreActive ? "text-barber-gold" : "text-barber-paper/65"
                )}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", moreActive && "bg-barber-gold/15")}>
                  <Menu className="h-4 w-4" />
                </span>
                Altro
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="border-barber-gold/30 bg-barber-dark text-barber-paper">
              <SheetHeader>
                <SheetTitle className="text-barber-gold">Altre sezioni</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid gap-2">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-lg border border-barber-gold/20 px-4 py-3 text-sm font-medium"
                    >
                      <Icon className="h-5 w-5 text-barber-gold" />
                      {item.label}
                    </Link>
                  );
                })}
                {isAdmin ? (
                  <Link
                    href="/forge/accessi"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-lg border border-barber-gold/20 px-4 py-3 text-sm font-medium"
                  >
                    <Shield className="h-5 w-5 text-barber-gold" />
                    Accessi GM
                  </Link>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
