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
import { useCampaignNavigation } from "@/components/campaigns/campaign-navigation-context";

import type { User } from "@supabase/supabase-js";

const PUBLIC_NAV_LINKS = [
  { href: "/scopri", label: "Scopri" },
  { href: "/masters", label: "Albo Master" },
  { href: "/hall-of-fame", label: "Classifica Eroi" },
  { href: "/contatti", label: "Contatti" },
] as const;

function isCampaignDetailPath(pathname: string | null): boolean {
  return Boolean(pathname?.match(/^\/campaigns\/[^/]+$/));
}

function navLinkClass(pathname: string | null, href: string) {
  const active = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));
  return cn(
    "text-xs font-serif uppercase tracking-wider transition-colors",
    active ? "text-brass-light font-bold drop-shadow-[0_0_8px_rgba(200,157,73,0.3)]" : "text-parchment-300 hover:text-brass-light"
  );
}

function sheetLinkClass(pathname: string | null, href: string) {
  const active = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));
  return cn(
    "rounded-lg px-3 py-2.5 text-sm font-serif uppercase tracking-wider transition-colors",
    active
      ? "bg-brass-base/15 text-brass-light font-bold border-l-2 border-brass-base"
      : "text-parchment-300 hover:bg-brass-base/10 hover:text-brass-light"
  );
}

export function NavbarNavLinks({ initialUser }: { initialUser?: User | null }) {
  const pathname = usePathname();
  const { user } = useSupabaseUser(initialUser);
  const currentUser = user ?? initialUser;
  const { navigation } = useCampaignNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const onCampaignDetail = isCampaignDetailPath(pathname);
  const isLoggedIn = Boolean(currentUser);

  const desktopLinks = PUBLIC_NAV_LINKS;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3 md:gap-4">
      {onCampaignDetail ? (
        <div
          className="hidden min-w-0 items-center gap-2 text-xs sm:flex sm:max-w-[min(52vw,34rem)]"
          aria-label="Posizione nella campagna"
        >
          <span className="shrink-0 text-parchment-500 font-serif">Campagna</span>
          <span className="text-guild-border">/</span>
          <span className="truncate font-serif text-sm font-bold text-parchment-100">
            {navigation?.campaignName ?? "Campagna"}
          </span>
          <span className="text-guild-border">/</span>
          <span className="truncate font-mono text-xs font-semibold text-brass-light">
            {navigation?.sectionLabel ?? "Workspace"}
          </span>
        </div>
      ) : (
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
                className="shrink-0 text-parchment-200 hover:bg-brass-base/10 hover:text-brass-light sm:hidden"
                aria-label="Apri menu di navigazione"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[min(100vw-2rem,20rem)] flex-col border-brass-base/30 bg-guild-oak text-parchment-100"
            >
              <SheetHeader>
                <SheetTitle className="text-left font-serif text-gold-relief text-lg">Menu di Gilda</SheetTitle>
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
              <div className="mt-auto flex flex-col gap-2 border-t border-guild-border pt-4">
                {isLoggedIn ? (
                  <Button
                    asChild
                    variant="wax"
                    className="w-full text-xs font-serif uppercase tracking-widest font-bold"
                  >
                    <Link href="/dashboard" onClick={closeMenu}>
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="stone"
                      className="w-full text-xs font-serif uppercase tracking-wider font-semibold text-brass-light"
                    >
                      <Link href="/login" onClick={closeMenu}>
                        Entra
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="wax"
                      className="w-full text-xs font-serif uppercase tracking-widest font-bold"
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
      )}

      <NavbarAuthSlot initialUser={currentUser} />
    </div>
  );
}
