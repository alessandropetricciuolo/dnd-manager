"use client";

import Link from "next/link";
import { NavbarUserMenu } from "@/components/navbar-user-menu";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

export function NavbarAuthLinks() {
  const { user, ready } = useSupabaseUser();

  if (ready && user) {
    return <NavbarUserMenu user={user} />;
  }

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
