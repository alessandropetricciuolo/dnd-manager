import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createMobileCharacterStatePatchHandler } from "@/lib/mobile/character-state-http";

export const runtime = "nodejs";

export const PATCH = createMobileCharacterStatePatchHandler((body) => {
  // Service-role access is confined to this server route after explicit actor and
  // campaign authorization; callers cannot submit arbitrary database columns.
  const admin: any = createSupabaseAdminClient();
  const operationType = body && typeof body === "object" ? (body as any).operation?.type : null;
  return {
    getUser: async (accessToken: string) => {
      const { data, error } = await admin.auth.getUser(accessToken);
      return error || !data.user ? null : { id: data.user.id };
    },
    getCharacter: async (id: string) => {
      const { data, error } = await admin.from("campaign_characters")
        .select("id,campaign_id,assigned_to,updated_at,hit_points,rules_snapshot,coins_gp,coins_sp,coins_cp,name,image_url,sheet_file_path,current_xp,level,character_class,class_subclass,armor_class,background,race_slug,subclass_slug,background_slug,created_at")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    getProfileRole: async (userId: string) => {
      const { data, error } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
    getCampaignGmId: async (campaignId: string) => {
      const { data, error } = await admin.from("campaigns").select("gm_id").eq("id", campaignId).maybeSingle();
      if (error) throw error;
      return data?.gm_id ?? null;
    },
    compareAndSwap: async (id: string, expectedUpdatedAt: string, next: any) => {
      const { data, error } = await admin.from("campaign_characters").update({
        hit_points: next.hit_points,
        rules_snapshot: next.rules_snapshot,
        ...(operationType === "coins" ? { coins_gp: next.coins_gp, coins_sp: next.coins_sp, coins_cp: next.coins_cp } : {}),
        updated_at: new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1)).toISOString(),
      }).eq("id", id).eq("updated_at", expectedUpdatedAt)
        .select("id,campaign_id,name,image_url,sheet_file_path,current_xp,level,character_class,class_subclass,armor_class,hit_points,background,race_slug,subclass_slug,background_slug,rules_snapshot,assigned_to,coins_gp,coins_sp,coins_cp,created_at,updated_at")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  };
});
