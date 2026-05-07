"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

function PublicAuthLinks() {
  return (
    <>
      <Link
        href="/login"
        className="text-sm font-medium text-barber-paper/90 transition-colors hover:text-barber-gold"
      >
        Entra
      </Link>
      <Link
        href="/login"
        className="rounded-md bg-barber-red px-4 py-2 text-sm font-medium text-barber-paper transition-colors hover:bg-barber-red/90"
      >
        Registrati
      </Link>
    </>
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
