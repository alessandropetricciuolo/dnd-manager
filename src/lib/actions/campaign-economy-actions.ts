"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type SessionEconomyPayload = {
  /** Distribuzione dal tesoretto di una missione completata. */
  missionTreasurePayout?: {
    missionId: string;
    allocations: { characterId: string; coins_gp: number; coins_sp: number; coins_cp: number }[];
  };
  /** Variazioni manuali ai salvadanai dei PG (sommate dopo l’eventuale distribuzione dal tesoretto). */
  characterCoinDeltas?: { characterId: string; coins_gp: number; coins_sp: number; coins_cp: number }[];
};

export type EconomyMissionSnapshot = {
  id: string;
  title: string;
  status: string;
  treasure_gp: number;
  treasure_sp: number;
  treasure_cp: number;
  completed_by_guild_id: string | null;
  completed_by_guild_name: string | null;
};

export type EconomyCharacterSnapshot = {
  id: string;
  name: string;
  assigned_to: string | null;
  assignee_label: string | null;
  coins_gp: number;
  coins_sp: number;
  coins_cp: number;
};

type AdminClient = SupabaseClient<Database>;

type ApplyCampaignEconomyRpcResult = {
  success: boolean;
  message?: string | null;
  balances?: Record<string, { coins_gp: number; coins_sp: number; coins_cp: number }> | null;
};

function nonNegInt(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return Math.max(0, Math.trunc(n));
  return 0;
}

function intDelta(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return Math.trunc(n);
  return 0;
}

async function isGmOrAdminByRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "gm" || profile?.role === "admin";
}

/** Dati economia per GM Screen / wizard chiusura sessione (solo campagne long). */
export async function getLongCampaignEconomySnapshot(campaignId: string): Promise<
  | { success: true; data: { missions: EconomyMissionSnapshot[]; characters: EconomyCharacterSnapshot[] } }
  | { success: false; message: string }
> {
  if (!campaignId) return { success: false, message: "Campagna non valida." };

  try {
    const supabase = await createSupabaseServerClient();
    if (!(await isGmOrAdminByRole(supabase))) {
      return { success: false, message: "Non autorizzato." };
    }

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("id, type")
      .eq("id", campaignId)
      .single();
    if (cErr || !campaign || campaign.type !== "long") {
      return { success: false, message: "Economia disponibile solo per campagne lunghe." };
    }

    const { data: guildsRaw } = await supabase.from("campaign_guilds").select("id, name").eq("campaign_id", campaignId);
    const guildNames = new Map<string, string>((guildsRaw ?? []).map((g) => [String((g as { id: string }).id), String((g as { name?: string }).name ?? "")]));

    const { data: missionsRaw, error: mErr } = await supabase
      .from("campaign_missions")
      .select("id, title, status, treasure_gp, treasure_sp, treasure_cp, completed_by_guild_id")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (mErr) {
      console.error("[getLongCampaignEconomySnapshot] missions", mErr);
      return { success: false, message: mErr.message ?? "Errore caricamento missioni." };
    }

    const missions: EconomyMissionSnapshot[] = (missionsRaw ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const gid = r.completed_by_guild_id != null ? String(r.completed_by_guild_id) : null;
      return {
        id: String(r.id),
        title: String(r.title ?? ""),
        status: String(r.status ?? "open"),
        treasure_gp: nonNegInt(r.treasure_gp),
        treasure_sp: nonNegInt(r.treasure_sp),
        treasure_cp: nonNegInt(r.treasure_cp),
        completed_by_guild_id: gid,
        completed_by_guild_name: gid ? (guildNames.get(gid) ?? null) : null,
      };
    });

    const { data: charsRaw, error: chErr } = await supabase
      .from("campaign_characters")
      .select("id, name, assigned_to, coins_gp, coins_sp, coins_cp")
      .eq("campaign_id", campaignId)
      .order("name", { ascending: true });

    if (chErr) {
      console.error("[getLongCampaignEconomySnapshot] characters", chErr);
      return { success: false, message: chErr.message ?? "Errore caricamento personaggi." };
    }

    const charRows = (charsRaw ?? []) as Record<string, unknown>[];
    const playerIds = [...new Set(charRows.map((c) => c.assigned_to).filter(Boolean).map(String))];
    const nameByPlayer = new Map<string, string>();
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, display_name")
        .in("id", playerIds);
      for (const p of profiles ?? []) {
        const pr = p as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          display_name: string | null;
        };
        const full = [pr.first_name, pr.last_name].filter(Boolean).join(" ").trim();
        nameByPlayer.set(pr.id, full || (pr.display_name ?? "").trim() || "Giocatore");
      }
    }

    const characters: EconomyCharacterSnapshot[] = charRows.map((r) => {
      const aid = r.assigned_to != null ? String(r.assigned_to) : null;
      return {
        id: String(r.id),
        name: String(r.name ?? ""),
        assigned_to: aid,
        assignee_label: aid ? (nameByPlayer.get(aid) ?? null) : null,
        coins_gp: nonNegInt(r.coins_gp),
        coins_sp: nonNegInt(r.coins_sp),
        coins_cp: nonNegInt(r.coins_cp),
      };
    });

    return { success: true, data: { missions, characters } };
  } catch (e) {
    console.error("[getLongCampaignEconomySnapshot]", e);
    return { success: false, message: e instanceof Error ? e.message : "Errore imprevisto." };
  }
}

/** Applica economia in chiusura sessione (admin client già autenticato service role). */
export async function applyCloseSessionEconomy(
  admin: AdminClient,
  campaignId: string,
  economy: SessionEconomyPayload | undefined
): Promise<
  | { success: true; balances: Record<string, { coins_gp: number; coins_sp: number; coins_cp: number }> }
  | { success: false; message: string }
> {
  if (!economy) return { success: true, balances: {} };
  const payout =
    economy.missionTreasurePayout?.missionId && economy.missionTreasurePayout.allocations?.length
      ? {
          missionId: economy.missionTreasurePayout.missionId,
          allocations: economy.missionTreasurePayout.allocations.map((allocation) => ({
            characterId: allocation.characterId,
            coins_gp: nonNegInt(allocation.coins_gp),
            coins_sp: nonNegInt(allocation.coins_sp),
            coins_cp: nonNegInt(allocation.coins_cp),
          })),
        }
      : null;
  const deltas =
    economy.characterCoinDeltas
      ?.map((delta) => ({
        characterId: delta.characterId,
        coins_gp: intDelta(delta.coins_gp),
        coins_sp: intDelta(delta.coins_sp),
        coins_cp: intDelta(delta.coins_cp),
      }))
      .filter((delta) => delta.coins_gp !== 0 || delta.coins_sp !== 0 || delta.coins_cp !== 0) ?? [];

  try {
    if (!payout && deltas.length === 0) {
      return { success: true, balances: {} };
    }

    const { data, error } = (await admin.rpc("apply_campaign_economy_atomic" as never, {
      p_campaign_id: campaignId,
      p_mission_id: payout?.missionId ?? null,
      p_allocations:
        payout?.allocations.map((allocation) => ({
          characterId: allocation.characterId,
          coins_gp: allocation.coins_gp,
          coins_sp: allocation.coins_sp,
          coins_cp: allocation.coins_cp,
        })) ?? [],
      p_deltas:
        deltas.map((delta) => ({
          characterId: delta.characterId,
          coins_gp: delta.coins_gp,
          coins_sp: delta.coins_sp,
          coins_cp: delta.coins_cp,
        })),
    } as never)) as { data: ApplyCampaignEconomyRpcResult | null; error: { message?: string } | null };

    if (error) {
      console.error("[applyCloseSessionEconomy] rpc", error);
      return { success: false, message: error.message ?? "Errore economia sessione." };
    }

    const result = data as ApplyCampaignEconomyRpcResult | null;
    if (!result?.success) {
      return { success: false, message: result?.message ?? "Errore economia sessione." };
    }

    return { success: true, balances: result.balances ?? {} };
  } catch (e) {
    console.error("[applyCloseSessionEconomy]", e);
    return { success: false, message: e instanceof Error ? e.message : "Errore economia sessione." };
  }
}

export async function updateMissionTreasureAction(
  campaignId: string,
  missionId: string,
  treasureGp: number,
  treasureSp: number,
  treasureCp: number
): Promise<{ success: true } | { success: false; message: string }> {
  const gp = nonNegInt(treasureGp);
  const sp = nonNegInt(treasureSp);
  const cp = nonNegInt(treasureCp);

  try {
    const supabase = await createSupabaseServerClient();
    if (!(await isGmOrAdminByRole(supabase))) {
      return { success: false, message: "Non autorizzato." };
    }

    const { data: mission, error: mErr } = await supabase
      .from("campaign_missions")
      .select("id, status")
      .eq("id", missionId)
      .eq("campaign_id", campaignId)
      .single();
    if (mErr || !mission || (mission as { status?: string }).status !== "completed") {
      return { success: false, message: "Missione non trovata o non completata." };
    }

    const { error } = await supabase
      .from("campaign_missions")
      .update({
        treasure_gp: gp,
        treasure_sp: sp,
        treasure_cp: cp,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Errore." };
  }
}

/** Variazione rapida monete PG (delta; il risultato non può essere negativo). */
export async function adjustCharacterCoinsDeltaAction(
  campaignId: string,
  characterId: string,
  deltaGp: number,
  deltaSp: number,
  deltaCp: number
): Promise<{ success: true } | { success: false; message: string }> {
  const dg = intDelta(deltaGp);
  const ds = intDelta(deltaSp);
  const dc = intDelta(deltaCp);
  if (dg === 0 && ds === 0 && dc === 0) {
    return { success: false, message: "Indica almeno una moneta da aggiungere o togliere." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!(await isGmOrAdminByRole(supabase))) {
      return { success: false, message: "Non autorizzato." };
    }

    const { data: campaign } = await supabase.from("campaigns").select("type").eq("id", campaignId).single();
    if (campaign?.type !== "long") {
      return { success: false, message: "Monete PG solo per campagne lunghe." };
    }

    const { data: char, error: cErr } = await supabase
      .from("campaign_characters")
      .select("coins_gp, coins_sp, coins_cp")
      .eq("id", characterId)
      .eq("campaign_id", campaignId)
      .single();
    if (cErr || !char) return { success: false, message: "Personaggio non trovato." };
    const ch = char as { coins_gp: number; coins_sp: number; coins_cp: number };
    const ng = nonNegInt(ch.coins_gp) + dg;
    const ns = nonNegInt(ch.coins_sp) + ds;
    const nc = nonNegInt(ch.coins_cp) + dc;
    if (ng < 0 || ns < 0 || nc < 0) {
      return { success: false, message: "Il personaggio non ha abbastanza monete di quel tipo." };
    }

    const { error } = await supabase
      .from("campaign_characters")
      .update({ coins_gp: ng, coins_sp: ns, coins_cp: nc } as never)
      .eq("id", characterId)
      .eq("campaign_id", campaignId);
    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Errore." };
  }
}

/** Distribuisce dal tesoretto missione → PG (indipendente dalla chiusura sessione). */
export async function distributeMissionTreasureAction(
  campaignId: string,
  missionId: string,
  allocations: { characterId: string; coins_gp: number; coins_sp: number; coins_cp: number }[]
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!(await isGmOrAdminByRole(supabase))) {
      return { success: false, message: "Non autorizzato." };
    }

    const { data: campaign } = await supabase.from("campaigns").select("type").eq("id", campaignId).single();
    if (campaign?.type !== "long") {
      return { success: false, message: "Tesoretto disponibile solo per campagne lunghe." };
    }

    const admin = createSupabaseAdminClient();
    return applyCloseSessionEconomy(admin, campaignId, {
      missionTreasurePayout: { missionId, allocations },
    });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Errore." };
  }
}

export async function adjustCharacterCoinsBatchAction(
  campaignId: string,
  deltas: { characterId: string; coins_gp: number; coins_sp: number; coins_cp: number }[]
): Promise<
  | {
      success: true;
      balances: Record<string, { coins_gp: number; coins_sp: number; coins_cp: number }>;
    }
  | { success: false; message: string }
> {
  const normalized = deltas
    .map((delta) => ({
      characterId: delta.characterId,
      coins_gp: intDelta(delta.coins_gp),
      coins_sp: intDelta(delta.coins_sp),
      coins_cp: intDelta(delta.coins_cp),
    }))
    .filter((delta) => delta.coins_gp !== 0 || delta.coins_sp !== 0 || delta.coins_cp !== 0);

  if (normalized.length === 0) {
    return { success: false, message: "Nessuna variazione valida da applicare." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!(await isGmOrAdminByRole(supabase))) {
      return { success: false, message: "Non autorizzato." };
    }

    const { data: campaign } = await supabase.from("campaigns").select("type").eq("id", campaignId).single();
    if (campaign?.type !== "long") {
      return { success: false, message: "Monete PG solo per campagne lunghe." };
    }

    const admin = createSupabaseAdminClient();
    const result = await applyCloseSessionEconomy(admin, campaignId, {
      characterCoinDeltas: normalized,
    });
    if (!result.success) {
      return result;
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true, balances: result.balances };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Errore." };
  }
}
