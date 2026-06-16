import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/types/database.types";

type ForgeAccessRow = Database["public"]["Tables"]["forge_access"]["Row"];
type GmProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "first_name" | "last_name" | "display_name" | "role"
>;

export type ForgeAuthContext = {
  userId: string;
  isAdmin: boolean;
  isGmOrAdmin: boolean;
  hasForgeAccess: boolean;
  canManageForgeAccess: boolean;
};

export async function getForgeAuthContext(): Promise<ForgeAuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  if (isAdmin) {
    return {
      userId: user.id,
      isAdmin: true,
      isGmOrAdmin: true,
      hasForgeAccess: true,
      canManageForgeAccess: true,
    };
  }

  if (profile?.role !== "gm") {
    return {
      userId: user.id,
      isAdmin: false,
      isGmOrAdmin: false,
      hasForgeAccess: false,
      canManageForgeAccess: false,
    };
  }

  const { data: access } = await supabase
    .from("forge_access")
    .select("enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasForgeAccess = access?.enabled === true;

  return {
    userId: user.id,
    isAdmin: false,
    isGmOrAdmin: true,
    hasForgeAccess,
    canManageForgeAccess: false,
  };
}

export async function requireForgeAccess(): Promise<ForgeAuthContext> {
  const ctx = await getForgeAuthContext();
  if (!ctx?.hasForgeAccess) {
    throw new Error("Non hai accesso a La Forgia.");
  }
  return ctx;
}

export async function requireForgeAdmin(): Promise<ForgeAuthContext> {
  const ctx = await getForgeAuthContext();
  if (!ctx?.isAdmin) {
    throw new Error("Solo gli admin possono gestire gli accessi.");
  }
  return ctx;
}

/** Lista GM per pannello accessi (solo admin). */
export async function listGmUsersForForgeAccess() {
  await requireForgeAdmin();
  const admin = createSupabaseAdminClient();

  const { data: gms } = await admin
    .from("profiles")
    .select("id, first_name, last_name, display_name, role")
    .eq("role", "gm")
    .order("first_name");

  const { data: accessRows } = await admin
    .from("forge_access")
    .select("id, user_id, enabled, granted_by, granted_at, revoked_at, note");

  const accessByUser = new Map(
    ((accessRows ?? []) as ForgeAccessRow[]).map((r) => [r.user_id, r])
  );

  return ((gms ?? []) as GmProfileRow[]).map((gm) => {
    const full = [gm.first_name, gm.last_name].filter(Boolean).join(" ").trim();
    const label = full || gm.display_name?.trim() || `GM ${gm.id.slice(0, 8)}`;
    return {
      id: gm.id,
      label,
      role: gm.role,
      forge_access: accessByUser.get(gm.id) ?? null,
    };
  });
}
