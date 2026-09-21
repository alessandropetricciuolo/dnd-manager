"use client";

import { NavbarAuthLinks } from "@/components/navbar-auth-links";
import type { User } from "@supabase/supabase-js";

export function NavbarAuthSlot({ initialUser }: { initialUser?: User | null }) {
  return <NavbarAuthLinks initialUser={initialUser} />;
}
