import type { createSupabaseServerClient } from "@/utils/supabase/server";

export type CommandCenterSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type CommandCenterAuthContext = {
  userId: string;
  role: "gm" | "admin";
  workspaceId: string | null;
};

export type TenantAdapter = {
  /** B&D: null (single-tenant). gmflow: workspace UUID obbligatorio. */
  resolveWorkspaceId(): string | null;

  assertCanAccessCommandCenter(
    supabase: CommandCenterSupabase
  ): Promise<{ ok: true; ctx: CommandCenterAuthContext } | { ok: false; error: string }>;

  assertCanLinkEntity(
    supabase: CommandCenterSupabase,
    entityType: string,
    entityId: string,
    campaignId?: string | null
  ): Promise<{ ok: true } | { ok: false; error: string }>;

  listCampaignsForPicker(
    supabase: CommandCenterSupabase
  ): Promise<{ id: string; name: string }[]>;
};
