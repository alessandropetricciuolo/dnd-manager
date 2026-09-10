import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./contracts";

export type McpAuthContext = {
  db: SupabaseClient;
  userId: string;
  isAdmin: boolean;
};

/** Bearer tokens are validated by Supabase Auth and the server-managed profile. */
export async function authenticate(request: Request): Promise<McpAuthContext> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [^\s]+$/.test(authorization)) throw new ApiError(401, "Bearer token required");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiError(503, "Backend not configured");
  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await db.auth.getUser(authorization.slice(7));
  if (authError || !authData.user) throw new ApiError(401, "Invalid or expired token");
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profileError || !profile) throw new ApiError(401, "Authentication failed");
  return { db, userId: authData.user.id, isAdmin: profile.role === "admin" };
}
