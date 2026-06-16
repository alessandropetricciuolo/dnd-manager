import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/types/database.types";

type VaultAccessRow = Database["public"]["Tables"]["vault_access"]["Row"];
type GmProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "first_name" | "last_name" | "display_name" | "role"
>;

export type VaultAuthContext = {
  userId: string;
  isAdmin: boolean;
  isGmOrAdmin: boolean;
  hasVaultAccess: boolean;
  canManageVaultAccess: boolean;
};

export async function getVaultAuthContext(): Promise<VaultAuthContext | null> {
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
      hasVaultAccess: true,
      canManageVaultAccess: true,
    };
  }

  if (profile?.role !== "gm") {
    return {
      userId: user.id,
      isAdmin: false,
      isGmOrAdmin: false,
      hasVaultAccess: false,
      canManageVaultAccess: false,
    };
  }

  const { data: access } = await supabase
    .from("vault_access")
    .select("enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    isAdmin: false,
    isGmOrAdmin: true,
    hasVaultAccess: access?.enabled === true,
    canManageVaultAccess: false,
  };
}

export async function requireVaultAccess(): Promise<VaultAuthContext> {
  const ctx = await getVaultAuthContext();
  if (!ctx?.hasVaultAccess) {
    throw new Error("Non hai accesso al Vault.");
  }
  return ctx;
}

export async function requireVaultAdmin(): Promise<VaultAuthContext> {
  const ctx = await getVaultAuthContext();
  if (!ctx?.isAdmin) {
    throw new Error("Solo gli admin possono gestire gli accessi al Vault.");
  }
  return ctx;
}

export async function listGmUsersForVaultAccess() {
  await requireVaultAdmin();
  const admin = createSupabaseAdminClient();

  const { data: gms } = await admin
    .from("profiles")
    .select("id, first_name, last_name, display_name, role")
    .eq("role", "gm")
    .order("first_name");

  const { data: accessRows } = await admin
    .from("vault_access")
    .select("id, user_id, enabled, granted_by, granted_at, revoked_at, note");

  const accessByUser = new Map(
    ((accessRows ?? []) as VaultAccessRow[]).map((r) => [r.user_id, r])
  );

  return ((gms ?? []) as GmProfileRow[]).map((gm) => {
    const full = [gm.first_name, gm.last_name].filter(Boolean).join(" ").trim();
    const label = full || gm.display_name?.trim() || `GM ${gm.id.slice(0, 8)}`;
    return {
      id: gm.id,
      label,
      role: gm.role,
      vault_access: accessByUser.get(gm.id) ?? null,
    };
  });
}
