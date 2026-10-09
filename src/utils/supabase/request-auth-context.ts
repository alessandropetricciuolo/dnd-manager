import { cache } from "react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { createSupabaseServerClient as createServerClientFactory } from "@/utils/supabase/server";

type RequestSupabaseClient = Awaited<ReturnType<typeof createServerClientFactory>>;

export const getRequestAuthContextForClient = cache(async (supabase: RequestSupabaseClient) => {
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
export const getRequestAuthContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  return getRequestAuthContextForClient(supabase);
});
