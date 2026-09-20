"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

function PublicAuthLinks() {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5">
      <Link
        href="/login"
        className="hidden text-xs font-serif uppercase tracking-wider text-parchment-200 transition-colors hover:text-brass-light sm:inline"
      >
        Entra
      </Link>
      <Link
        href="/login"
        className="btn-wax-seal inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-serif uppercase tracking-widest font-bold text-parchment-100 shadow-md sm:px-4 sm:py-1.5"
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
