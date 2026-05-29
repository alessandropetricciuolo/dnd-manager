"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

function PublicAuthLinks() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="hidden text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold sm:inline"
      >
        Entra
      </Link>
      <Link
        href="/login"
        className="rounded-md bg-barber-red px-3 py-1.5 text-sm font-medium text-barber-paper transition-colors hover:bg-barber-red/90 sm:px-4 sm:py-2"
      >
        Unisciti
      </Link>
    </div>
  );
}

const NavbarAuthLinks = dynamic(
  () => import("@/components/navbar-auth-links").then((mod) => mod.NavbarAuthLinks),
  {
    ssr: false,
    loading: PublicAuthLinks,
  }
);

export function NavbarAuthSlot() {
  return <NavbarAuthLinks />;
}
