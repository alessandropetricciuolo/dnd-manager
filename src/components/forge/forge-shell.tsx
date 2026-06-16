"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Hammer,
  LayoutDashboard,
  Package,
  Receipt,
  Shield,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ForgeShellProps = {
  children: React.ReactNode;
  isAdmin: boolean;
};

const NAV = [
  { href: "/forge", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/forge/prodotti", label: "Prodotti", icon: Package },
  { href: "/forge/vendite/nuova", label: "Nuova vendita", icon: ShoppingCart },
  { href: "/forge/magazzino", label: "Movimenti magazzino", icon: Boxes },
  { href: "/forge/conti", label: "Conti", icon: Wallet },
  { href: "/forge/report", label: "Report incassi", icon: BarChart3 },
] as const;

export function ForgeShell({ children, isAdmin }: ForgeShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <header className="sticky top-0 z-20 border-b border-barber-gold/25 bg-barber-dark/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-barber-paper/80 hover:text-barber-gold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-barber-gold">
            <Hammer className="h-5 w-5" />
            <span className="text-lg font-semibold">La Forgia</span>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
