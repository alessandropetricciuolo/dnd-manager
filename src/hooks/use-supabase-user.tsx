"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type SupabaseUserState = { user: User | null; ready: boolean };
const SupabaseUserContext = createContext<SupabaseUserState | null>(null);

export function SupabaseUserProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authEventVersion = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      authEventVersion += 1;
      setUser(session?.user ?? null);
      setReady(true);
    });

    const versionBeforeLookup = authEventVersion;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted || authEventVersion !== versionBeforeLookup) return;
      setUser(data.user ?? null);
      setReady(true);
    }).catch(() => {
      if (!mounted || authEventVersion !== versionBeforeLookup) return;
      setUser(null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SupabaseUserContext.Provider value={{ user, ready }}>
      {children}
    </SupabaseUserContext.Provider>
  );
}

export function useSupabaseUser(initialUser?: User | null) {
  const sharedState = useContext(SupabaseUserContext);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [ready, setReady] = useState(Boolean(initialUser));

  useEffect(() => {
    if (sharedState) return;
    let mounted = true;
    let authEventVersion = 0;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion += 1;
      if (!mounted) return;
      setUser(session?.user ?? null);
      setReady(true);
    });

    const versionBeforeLookup = authEventVersion;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted || authEventVersion !== versionBeforeLookup) return;
      setUser(data.user ?? null);
      setReady(true);
    }).catch(() => {
      if (!mounted || authEventVersion !== versionBeforeLookup) return;
      setUser(null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [sharedState, supabase]);

  return sharedState ?? { user, ready };
}
