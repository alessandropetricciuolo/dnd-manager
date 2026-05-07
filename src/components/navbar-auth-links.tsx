"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { NavbarUserMenu } from "@/components/navbar-user-menu";

export function NavbarAuthLinks() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (ready && user) {
    return <NavbarUserMenu user={user} />;
  }

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
