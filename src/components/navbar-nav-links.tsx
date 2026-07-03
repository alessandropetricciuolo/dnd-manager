"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavbarAuthSlot } from "@/components/navbar-auth-slot";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { cn } from "@/lib/utils";

const PUBLIC_NAV_LINKS = [
  { href: "/scopri", label: "Scopri" },
  { href: "/masters", label: "Albo Master" },
  { href: "/hall-of-fame", label: "Classifica Eroi" },
  { href: "/contatti", label: "Contatti" },
] as const;

const LOGGED_IN_NAV_LINK = { href: "/dashboard", label: "Area personale" } as const;

function isCampaignDetailPath(pathname: string | null): boolean {
  return Boolean(pathname?.match(/^\/campaigns\/[^/]+$/));
}

function navLinkClass(pathname: string | null, href: string) {
  const active = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));
  return cn(
    "text-sm font-medium transition-colors",
    active ? "text-barber-gold" : "text-barber-paper/90 hover:text-barber-gold"
  );
}

function sheetLinkClass(pathname: string | null, href: string) {
  const active = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));
  return cn(
    "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
    active
      ? "bg-barber-gold/15 text-barber-gold"
      : "text-barber-paper/90 hover:bg-barber-gold/10 hover:text-barber-gold"
  );
}

export function NavbarNavLinks() {
  const pathname = usePathname();
  const { user, ready } = useSupabaseUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const onCampaignDetail = isCampaignDetailPath(pathname);
  const isLoggedIn = ready && Boolean(user);

  const desktopLinks = isLoggedIn
    ? [LOGGED_IN_NAV_LINK, ...PUBLIC_NAV_LINKS]
    : [...PUBLIC_NAV_LINKS];

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3 md:gap-4">
      {!onCampaignDetail ? (
        <>
          <div className="hidden items-center gap-4 md:gap-6 sm:flex">
            {desktopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(pathname, link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold sm:hidden"
                aria-label="Apri menu di navigazione"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[min(100vw-2rem,20rem)] flex-col border-barber-gold/20 bg-barber-dark text-barber-paper"
            >
              <SheetHeader>
                <SheetTitle className="text-left font-serif text-barber-gold">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                {desktopLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={sheetLinkClass(pathname, link.href)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-barber-gold/20 pt-4">
                {isLoggedIn ? (
                  <Button
                    asChild
                    className="w-full bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                  >
                    <Link href="/dashboard" onClick={closeMenu}>
                      Area personale
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
                    >
                      <Link href="/login" onClick={closeMenu}>
                        Entra
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full bg-barber-red text-barber-paper hover:bg-barber-red/90"
                    >
                      <Link href="/login" onClick={closeMenu}>
                        Unisciti
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      <NavbarAuthSlot />
    </div>
  );
}
