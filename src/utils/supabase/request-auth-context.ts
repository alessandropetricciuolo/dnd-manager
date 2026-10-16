import { cache } from "react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { createSupabaseServerClient as createServerClientFactory } from "@/utils/supabase/server";

type RequestSupabaseClient = Awaited<ReturnType<typeof createServerClientFactory>>;

// React 18 does not expose cache() in every runtime (including the Node test runner).
// Keep request memoization when provided by the runtime, while remaining callable otherwise.
const safeCache = typeof cache === "function" ? cache : (<T extends (...args: any[]) => any>(fn: T): T => fn);

export const getRequestAuthContextForClient = safeCache(async (supabase: RequestSupabaseClient) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, nickname, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
});

/**
 * Auth and role data shared by server components during one render request.
 * React cache is request scoped, so no identity or role is retained between users.
 */
export const getRequestAuthContext = safeCache(async () => {
  const supabase = await createSupabaseServerClient();
  return getRequestAuthContextForClient(supabase);
});
