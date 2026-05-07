"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { parseGuildRank, rankFromPoints } from "@/lib/missions/guild-ranks";
import type { BulkMissionImportItem } from "@/lib/missions/mission-bulk-import";
import type { Json } from "@/types/database.types";

export type MissionBoardResult =
  | { success: true }
  | { success: false; message: string };

async function isGmOrAdminByRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "gm" || profile?.role === "admin";
}

async function isAdminByRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

// =============================
// Guilds CRUD (GM/Admin only)
// =============================
export async function createGuildAction(
  campaignId: string,
  name: string,
  rank: string,
  score: number,
  autoRank: boolean
): Promise<MissionBoardResult> {
  const trimmedName = name.trim();
  const parsedRank = parseGuildRank(rank);
  if (!campaignId || !trimmedName) {
    return { success: false, message: "Dati gilda non validi." };
  }

  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.trunc(score)) : 0;

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase.from("campaign_guilds").upsert(
      {
        campaign_id: campaignId,
        name: trimmedName,
        rank: parsedRank,
        score: normalizedScore,
        auto_rank: autoRank,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,name" }
    );

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function updateGuildAction(
  campaignId: string,
  guildId: string,
  name: string,
  rank: string,
  score: number,
  autoRank: boolean
): Promise<MissionBoardResult> {
  const trimmedName = name.trim();
  const parsedRank = parseGuildRank(rank);
  if (!campaignId || !guildId || !trimmedName) {
    return { success: false, message: "Dati gilda non validi." };
  }

  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.trunc(score)) : 0;

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase
      .from("campaign_guilds")
      .update({
        name: trimmedName,
        rank: parsedRank,
        score: normalizedScore,
        auto_rank: autoRank,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guildId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

/** Imposta il solo rango in base ai punti attuali (override “matematico” in un click). */
export async function applyGuildRankFromPointsAction(
  campaignId: string,
  guildId: string
): Promise<MissionBoardResult> {
  if (!campaignId || !guildId) {
    return { success: false, message: "Dati non validi." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { data: row, error: fetchErr } = await supabase
      .from("campaign_guilds")
      .select("score")
      .eq("id", guildId)
      .eq("campaign_id", campaignId)
      .single();

    if (fetchErr || !row) {
      return { success: false, message: fetchErr?.message ?? "Gilda non trovata." };
    }

    const score = typeof (row as { score?: number }).score === "number" ? (row as { score: number }).score : 0;
    const newRank = rankFromPoints(score);

    const { error } = await supabase
      .from("campaign_guilds")
      .update({
        rank: newRank,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guildId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function deleteGuildAction(
  campaignId: string,
  guildId: string
): Promise<MissionBoardResult> {
  if (!campaignId || !guildId) {
    return { success: false, message: "Dati gilda non validi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase
      .from("campaign_guilds")
      .delete()
      .eq("id", guildId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

// =============================
// Missions CRUD (GM/Admin only)
// =============================
export async function createMissionAction(
  campaignId: string,
  grade: string,
  title: string,
  committente: string,
  ubicazione: string,
  paga: string,
  urgenza: string,
  description: string,
  pointsReward: number
): Promise<MissionBoardResult> {
  const g = grade.trim();
  const t = title.trim();
  const c = committente.trim();
  const u = ubicazione.trim();
  const p = paga.trim();
  const urg = urgenza.trim();
  const d = description.trim();
  const pts = Number.isFinite(pointsReward) ? Math.max(0, Math.trunc(pointsReward)) : 0;

  if (!campaignId || !g || !t || !c || !u || !p || !urg || !d) {
    return { success: false, message: "Compila tutti i campi missione." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const insertRow: Record<string, unknown> = {
      campaign_id: campaignId,
      grade: g,
      title: t,
      committente: c,
      ubicazione: u,
      paga: p,
      urgenza: urg,
      description: d,
      points_reward: pts,
      status: "open",
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from("campaign_missions").insert(insertRow);

    if (error && isMissingMissionProgressColumns(error)) {
      const { points_reward, status, ...legacy } = insertRow;
      void points_reward;
      void status;
      ({ error } = await supabase.from("campaign_missions").insert(legacy));
    }

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export type BulkImportMissionsResult =
  | { success: true; message: string; imported: number }
  | { success: false; message: string };

/** Import massivo missioni (solo ruolo admin). Tutte le righe vengono create come status "open". */
export async function bulkImportMissionsAction(
  campaignId: string,
  items: BulkMissionImportItem[]
): Promise<BulkImportMissionsResult> {
  if (!campaignId?.trim()) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, message: "Nessuna missione da importare." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Solo gli amministratori possono importare missioni in massa." };

    const now = new Date().toISOString();
    const fullRows: Record<string, unknown>[] = items.map((it) => ({
      campaign_id: campaignId,
      grade: it.grade,
      title: it.title,
      committente: it.committente,
      ubicazione: it.ubicazione,
      paga: it.paga,
      urgenza: it.urgenza,
      description: it.description,
      points_reward: it.points_reward,
      status: "open",
      updated_at: now,
    }));

    let { data, error } = await supabase.from("campaign_missions").insert(fullRows).select("id");

    if (error && isMissingMissionProgressColumns(error)) {
      const legacyRows = fullRows.map((row) => {
        const { points_reward, status, ...rest } = row;
        void points_reward;
        void status;
        return rest;
      });
      ({ data, error } = await supabase.from("campaign_missions").insert(legacyRows).select("id"));
    }

    if (error) {
      return { success: false, message: error.message ?? "Errore durante l'importazione." };
    }

    const imported = Array.isArray(data) ? data.length : 0;
    revalidatePath(`/campaigns/${campaignId}`);
    const message =
      imported === 1 ? "1 missione importata." : `${imported} missioni importate.`;
    return { success: true, message, imported };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

function isMissingMissionProgressColumns(err: { message?: string } | null): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("points_reward") ||
    m.includes("status") ||
    m.includes("schema cache") ||
    m.includes("column")
  );
}

function normalizeMissionStatus(status: string | null | undefined): "open" | "in_progress" | "completed" {
  if (status === "completed" || status === "in_progress") return status;
  return "open";
}

export async function updateMissionAction(
  campaignId: string,
  missionId: string,
  grade: string,
  title: string,
  committente: string,
  ubicazione: string,
  paga: string,
  urgenza: string,
  description: string,
  pointsReward: number
): Promise<MissionBoardResult> {
  const g = grade.trim();
  const t = title.trim();
  const c = committente.trim();
  const u = ubicazione.trim();
  const p = paga.trim();
  const urg = urgenza.trim();
  const d = description.trim();
  const pts = Number.isFinite(pointsReward) ? Math.max(0, Math.trunc(pointsReward)) : 0;

  if (!campaignId || !missionId || !g || !t || !c || !u || !p || !urg || !d) {
    return { success: false, message: "Compila tutti i campi missione." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const updateRow: Record<string, unknown> = {
      grade: g,
      title: t,
      committente: c,
      ubicazione: u,
      paga: p,
      urgenza: urg,
      description: d,
      points_reward: pts,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("campaign_missions")
      .update(updateRow)
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error && isMissingMissionProgressColumns(error)) {
      const { points_reward, ...legacy } = updateRow;
      void points_reward;
      ({ error } = await supabase
        .from("campaign_missions")
        .update(legacy)
        .eq("id", missionId)
        .eq("campaign_id", campaignId));
    }

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function setMissionProgressStatusAction(
  campaignId: string,
  missionId: string,
  status: "open" | "in_progress"
): Promise<MissionBoardResult> {
  if (!campaignId || !missionId) {
    return { success: false, message: "Dati missione non validi." };
  }
  if (status !== "open" && status !== "in_progress") {
    return { success: false, message: "Stato missione non valido." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { data: mission, error: missionErr } = await supabase
      .from("campaign_missions")
      .select("status")
      .eq("id", missionId)
      .eq("campaign_id", campaignId)
      .single();
    if (missionErr || !mission) {
      return { success: false, message: missionErr?.message ?? "Missione non trovata." };
    }

    const currentStatus = String((mission as { status?: string }).status ?? "open");
    if (currentStatus === "completed") {
      return {
        success: false,
        message: "La missione è completata. Riaprila prima di cambiarne lo stato di avanzamento.",
      };
    }
    if (currentStatus === status) {
      return { success: true };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("campaign_missions")
      .update({
        status,
        completed_at: null,
        completed_by_guild_id: null,
        updated_at: now,
      })
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("status") || msg.includes("schema cache")) {
        return {
          success: false,
          message: "Aggiorna il database (migration missioni: stato in_progress) e riprova.",
        };
      }
      return { success: false, message: error.message };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function setMissionAvailabilityStatusAction(
  campaignId: string,
  missionId: string,
  status: "open" | "completed"
): Promise<MissionBoardResult> {
  if (!campaignId || !missionId) {
    return { success: false, message: "Dati missione non validi." };
  }
  if (status !== "open" && status !== "completed") {
    return { success: false, message: "Stato missione non valido." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { data: mission, error: missionErr } = await supabase
      .from("campaign_missions")
      .select("status")
      .eq("id", missionId)
      .eq("campaign_id", campaignId)
      .single();
    if (missionErr || !mission) {
      return { success: false, message: missionErr?.message ?? "Missione non trovata." };
    }

    const currentStatus = normalizeMissionStatus((mission as { status?: string }).status);
    if (currentStatus === status) return { success: true };

    if (status === "open") {
      // Riusa la logica robusta che ripristina i punti gilda se la missione era stata completata con una gilda.
      return reopenMissionAction(campaignId, missionId);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("campaign_missions")
      .update({
        status: "completed",
        completed_at: now,
        completed_by_guild_id: null,
        treasure_gp: 0,
        treasure_sp: 0,
        treasure_cp: 0,
        updated_at: now,
      })
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("status") || msg.includes("schema cache")) {
        return {
          success: false,
          message: "Aggiorna il database (migration missioni: stato in_progress) e riprova.",
        };
      }
      return { success: false, message: error.message };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function completeMissionAction(
  campaignId: string,
  missionId: string,
  guildId: string,
  treasure?: { gp: number; sp: number; cp: number } | null
): Promise<MissionBoardResult> {
  if (!campaignId || !missionId || !guildId) {
    return { success: false, message: "Dati non validi." };
  }

  const tgp = treasure != null && Number.isFinite(treasure.gp) ? Math.max(0, Math.trunc(treasure.gp)) : 0;
  const tsp = treasure != null && Number.isFinite(treasure.sp) ? Math.max(0, Math.trunc(treasure.sp)) : 0;
  const tcp = treasure != null && Number.isFinite(treasure.cp) ? Math.max(0, Math.trunc(treasure.cp)) : 0;

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { data: mission, error: mErr } = await supabase
      .from("campaign_missions")
      .select("id, status, points_reward")
      .eq("id", missionId)
      .eq("campaign_id", campaignId)
      .single();

    if (mErr || !mission) {
      return { success: false, message: mErr?.message ?? "Missione non trovata." };
    }

    const m = mission as { status?: string; points_reward?: number };
    if (m.status === "completed") {
      return { success: false, message: "Missione già completata." };
    }

    const reward =
      typeof m.points_reward === "number" && Number.isFinite(m.points_reward)
        ? Math.max(0, Math.trunc(m.points_reward))
        : 0;

    const { data: guild, error: gErr } = await supabase
      .from("campaign_guilds")
      .select("id, score, auto_rank, rank")
      .eq("id", guildId)
      .eq("campaign_id", campaignId)
      .single();

    if (gErr || !guild) {
      return { success: false, message: gErr?.message ?? "Gilda non trovata nella campagna." };
    }

    const g = guild as { score: number; auto_rank?: boolean; rank?: string };
    const prevScore = typeof g.score === "number" ? g.score : 0;
    const newScore = prevScore + reward;
    const autoRank = g.auto_rank !== false;

    const now = new Date().toISOString();

    const guildUpdate: Record<string, unknown> = {
      score: newScore,
      updated_at: now,
    };
    if (autoRank) {
      guildUpdate.rank = rankFromPoints(newScore);
    }

    let errG = (
      await supabase.from("campaign_guilds").update(guildUpdate).eq("id", guildId).eq("campaign_id", campaignId)
    ).error;

    if (
      errG &&
      ((errG.message ?? "").toLowerCase().includes("rank") ||
        (errG.message ?? "").toLowerCase().includes("auto_rank"))
    ) {
      const { rank: _r, auto_rank: _a, ...scoreOnly } = guildUpdate;
      void _r;
      void _a;
      errG = (
        await supabase.from("campaign_guilds").update(scoreOnly).eq("id", guildId).eq("campaign_id", campaignId)
      ).error;
    }

    if (errG) return { success: false, message: errG.message };

    const missionUpdate: Record<string, unknown> = {
      status: "completed",
      completed_at: now,
      completed_by_guild_id: guildId,
      updated_at: now,
      treasure_gp: tgp,
      treasure_sp: tsp,
      treasure_cp: tcp,
    };

    const errM = (
      await supabase.from("campaign_missions").update(missionUpdate).eq("id", missionId).eq("campaign_id", campaignId)
    ).error;

    if (
      errM &&
      ((errM.message ?? "").toLowerCase().includes("status") ||
        (errM.message ?? "").toLowerCase().includes("schema cache"))
    ) {
      await supabase
        .from("campaign_guilds")
        .update({
          score: prevScore,
          updated_at: now,
          ...(autoRank ? { rank: parseGuildRank(String(g.rank ?? "D")) } : {}),
        })
        .eq("id", guildId)
        .eq("campaign_id", campaignId);
      return {
        success: false,
        message:
          "Aggiorna il database (migration missioni: stato, punti, completamento). Punti non applicati.",
      };
    }

    if (errM) {
      await supabase
        .from("campaign_guilds")
        .update({
          score: prevScore,
          updated_at: now,
          ...(autoRank ? { rank: parseGuildRank(String(g.rank ?? "D")) } : {}),
        })
        .eq("id", guildId)
        .eq("campaign_id", campaignId);
      return { success: false, message: errM.message };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function reopenMissionAction(campaignId: string, missionId: string): Promise<MissionBoardResult> {
  if (!campaignId || !missionId) {
    return { success: false, message: "Dati non validi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { data: mission, error: mErr } = await supabase
      .from("campaign_missions")
      .select("id, status, points_reward, completed_by_guild_id")
      .eq("id", missionId)
      .eq("campaign_id", campaignId)
      .single();

    if (mErr || !mission) {
      return { success: false, message: mErr?.message ?? "Missione non trovata." };
    }

    const m = mission as {
      status?: string;
      points_reward?: number;
      completed_by_guild_id?: string | null;
    };

    if (m.status !== "completed") {
      return { success: false, message: "La missione non è completata." };
    }

    const reward =
      typeof m.points_reward === "number" && Number.isFinite(m.points_reward)
        ? Math.max(0, Math.trunc(m.points_reward))
        : 0;
    const gid = m.completed_by_guild_id;

    const now = new Date().toISOString();

    const clearMission: Record<string, unknown> = {
      status: "open",
      completed_at: null,
      completed_by_guild_id: null,
      treasure_gp: 0,
      treasure_sp: 0,
      treasure_cp: 0,
      updated_at: now,
    };

    let errM = (
      await supabase.from("campaign_missions").update(clearMission).eq("id", missionId).eq("campaign_id", campaignId)
    ).error;

    if (
      errM &&
      ((errM.message ?? "").toLowerCase().includes("status") ||
        (errM.message ?? "").toLowerCase().includes("schema cache"))
    ) {
      return {
        success: false,
        message: "Aggiorna il database (migration missioni). Operazione non eseguita.",
      };
    }

    if (errM) return { success: false, message: errM.message };

    if (gid && reward > 0) {
      const { data: guild, error: gErr } = await supabase
        .from("campaign_guilds")
        .select("score, auto_rank, rank")
        .eq("id", gid)
        .eq("campaign_id", campaignId)
        .single();

      if (!gErr && guild) {
        const g = guild as { score: number; auto_rank?: boolean; rank?: string };
        const prevScore = typeof g.score === "number" ? g.score : 0;
        const newScore = Math.max(0, prevScore - reward);
        const autoRank = g.auto_rank !== false;

        const guildUpdate: Record<string, unknown> = {
          score: newScore,
          updated_at: now,
        };
        if (autoRank) {
          guildUpdate.rank = rankFromPoints(newScore);
        }

        let errG = (
          await supabase.from("campaign_guilds").update(guildUpdate).eq("id", gid).eq("campaign_id", campaignId)
        ).error;

        if (
          errG &&
          ((errG.message ?? "").toLowerCase().includes("rank") ||
            (errG.message ?? "").toLowerCase().includes("auto_rank"))
        ) {
          const { rank: _r, auto_rank: _a, ...scoreOnly } = guildUpdate;
          void _r;
          void _a;
          errG = (
            await supabase.from("campaign_guilds").update(scoreOnly).eq("id", gid).eq("campaign_id", campaignId)
          ).error;
        }

        if (errG) console.error("[reopenMissionAction] guild score rollback", errG);
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function deleteMissionAction(
  campaignId: string,
  missionId: string
): Promise<MissionBoardResult> {
  if (!campaignId || !missionId) {
    return { success: false, message: "Dati missione non validi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { data: mission } = await supabase
      .from("campaign_missions")
      .select("status, points_reward, completed_by_guild_id")
      .eq("id", missionId)
      .eq("campaign_id", campaignId)
      .single();

    const m = mission as { status?: string; points_reward?: number; completed_by_guild_id?: string | null } | null;

    const { error } = await supabase
      .from("campaign_missions")
      .delete()
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    // Ripristina punti se era completata (coerenza con reopen)
    if (m?.status === "completed" && m.completed_by_guild_id) {
      const reward =
        typeof m.points_reward === "number" && Number.isFinite(m.points_reward)
          ? Math.max(0, Math.trunc(m.points_reward))
          : 0;
      if (reward > 0) {
        const { data: guild } = await supabase
          .from("campaign_guilds")
          .select("score, auto_rank, rank")
          .eq("id", m.completed_by_guild_id)
          .eq("campaign_id", campaignId)
          .single();

        if (guild) {
          const g = guild as { score: number; auto_rank?: boolean; rank?: string };
          const prevScore = typeof g.score === "number" ? g.score : 0;
          const newScore = Math.max(0, prevScore - reward);
          const autoRank = g.auto_rank !== false;
          const gu: Record<string, unknown> = {
            score: newScore,
            updated_at: new Date().toISOString(),
          };
          if (autoRank) {
            gu.rank = rankFromPoints(newScore);
          }
          let ge = (await supabase.from("campaign_guilds").update(gu).eq("id", m.completed_by_guild_id!).eq("campaign_id", campaignId))
            .error;
          if (ge && (ge.message ?? "").toLowerCase().includes("rank")) {
            const { rank: _r, auto_rank: _a, ...so } = gu;
            void _r;
            void _a;
            ge = (
              await supabase.from("campaign_guilds").update(so).eq("id", m.completed_by_guild_id!).eq("campaign_id", campaignId)
            ).error;
          }
          if (ge) console.error("[deleteMissionAction] guild adjust", ge);
        }
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export type MissionEncounterMonsterConfig = {
  id: string;
  wiki_entity_id: string;
  quantity: number;
  sort_order: number;
  monster_name: string;
  monster_hp: number;
  monster_xp: number;
  is_core?: boolean;
  global_status?: "alive" | "dead";
};

export type MissionEncounterConfig = {
  id: string;
  campaign_id: string;
  mission_id: string;
  mission_title: string;
  name: string;
  notes: string | null;
  sort_order: number;
  monsters: MissionEncounterMonsterConfig[];
};

type MissionEncounterMonsterInput = {
  wikiEntityId: string;
  quantity: number;
};

function extractMonsterHp(attributes: unknown): number {
  const hpRaw = (attributes as { combat_stats?: { hp?: string | number | null } } | null)?.combat_stats?.hp;
  if (typeof hpRaw === "number" && Number.isFinite(hpRaw)) return Math.max(0, Math.trunc(hpRaw));
  const parsed = Number.parseInt(String(hpRaw ?? "").trim(), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

async function ensureMissionBelongsToCampaign(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  missionId: string
) {
  const { data: mission, error } = await supabase
    .from("campaign_missions")
    .select("id, title")
    .eq("id", missionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error || !mission) {
    return null;
  }
  return mission as { id: string; title: string | null };
}

async function ensureEncounterBelongsToCampaign(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  encounterId: string
) {
  const { data: encounter, error } = await supabase
    .from("mission_encounters")
    .select("id, campaign_id, mission_id")
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error || !encounter) {
    return null;
  }
  return encounter as { id: string; campaign_id: string; mission_id: string };
}

async function loadMissionEncounterConfigs(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  missionId?: string
): Promise<MissionEncounterConfig[]> {
  const encountersQuery = supabase
    .from("mission_encounters")
    .select("id, campaign_id, mission_id, name, notes, sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (missionId) {
    encountersQuery.eq("mission_id", missionId);
  }

  const { data: encounterRows, error: encountersError } = await encountersQuery;
  if (encountersError || !encounterRows) {
    throw new Error(encountersError?.message ?? "Errore nel caricamento degli incontri.");
  }

  if (encounterRows.length === 0) return [];

  const encounterIds = encounterRows.map((row) => row.id);
  const missionIds = [...new Set(encounterRows.map((row) => row.mission_id))];

  const [{ data: missionRows, error: missionsError }, { data: monsterRows, error: monstersError }] = await Promise.all([
    supabase.from("campaign_missions").select("id, title").in("id", missionIds),
    supabase
      .from("mission_encounter_monsters")
      .select("id, encounter_id, wiki_entity_id, quantity, sort_order")
      .in("encounter_id", encounterIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (missionsError) {
    throw new Error(missionsError.message ?? "Errore nel caricamento missioni degli incontri.");
  }
  if (monstersError) {
    throw new Error(monstersError.message ?? "Errore nel caricamento mostri degli incontri.");
  }

  const wikiEntityIds = [...new Set((monsterRows ?? []).map((row) => row.wiki_entity_id))];
  let wikiRows:
    | Array<{
        id: string;
        name: string;
        attributes: Json | null;
        xp_value: number | null;
        is_core?: boolean | null;
        global_status?: string | null;
      }>
    | null = [];
  if (wikiEntityIds.length > 0) {
    const { data, error } = await supabase
      .from("wiki_entities")
      .select("id, name, attributes, xp_value, is_core, global_status")
      .in("id", wikiEntityIds);
    if (error) {
      throw new Error(error.message ?? "Errore nel caricamento dettagli mostri.");
    }
    wikiRows = (data ?? []) as typeof wikiRows;
  }

  const missionTitleById = new Map(
    ((missionRows ?? []) as Array<{ id: string; title: string | null }>).map((row) => [row.id, row.title?.trim() || "Missione"])
  );
  const wikiById = new Map(
    (wikiRows ?? []).map((row) => [
      row.id,
      {
        name: row.name,
        hp: extractMonsterHp(row.attributes),
        xp: typeof row.xp_value === "number" && Number.isFinite(row.xp_value) ? Math.max(0, Math.trunc(row.xp_value)) : 0,
        is_core: row.is_core === true,
        global_status:
          row.global_status === "alive" || row.global_status === "dead"
            ? (row.global_status as "alive" | "dead")
            : undefined,
      },
    ])
  );

  const monstersByEncounterId = new Map<string, MissionEncounterMonsterConfig[]>();
  for (const row of (monsterRows ?? []) as Array<{
    id: string;
    encounter_id: string;
    wiki_entity_id: string;
    quantity: number;
    sort_order: number;
  }>) {
    const wiki = wikiById.get(row.wiki_entity_id);
    if (!wiki) continue;
    const list = monstersByEncounterId.get(row.encounter_id) ?? [];
    list.push({
      id: row.id,
      wiki_entity_id: row.wiki_entity_id,
      quantity: Math.max(1, Math.trunc(row.quantity)),
      sort_order: Math.max(0, Math.trunc(row.sort_order)),
      monster_name: wiki.name,
      monster_hp: wiki.hp,
      monster_xp: wiki.xp,
      ...(wiki.is_core ? { is_core: true } : {}),
      ...(wiki.global_status ? { global_status: wiki.global_status } : {}),
    });
    monstersByEncounterId.set(row.encounter_id, list);
  }

  return encounterRows.map((row) => ({
    id: row.id,
    campaign_id: row.campaign_id,
    mission_id: row.mission_id,
    mission_title: missionTitleById.get(row.mission_id) ?? "Missione",
    name: row.name,
    notes: row.notes ?? null,
    sort_order: row.sort_order,
    monsters: monstersByEncounterId.get(row.id) ?? [],
  }));
}

export async function listMissionEncountersAction(
  campaignId: string,
  missionId?: string
): Promise<{ success: true; data: MissionEncounterConfig[] } | { success: false; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    if (missionId) {
      const mission = await ensureMissionBelongsToCampaign(supabase, campaignId, missionId);
      if (!mission) return { success: false, message: "Missione non trovata." };
    }

    const data = await loadMissionEncounterConfigs(supabase, campaignId, missionId);
    return { success: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function createMissionEncounterAction(
  campaignId: string,
  missionId: string,
  payload: { name: string; notes?: string | null }
): Promise<{ success: true; data: MissionEncounterConfig } | { success: false; message: string }> {
  const name = payload.name.trim();
  const notes = payload.notes?.trim() || null;
  if (!campaignId || !missionId || !name) {
    return { success: false, message: "Nome incontro non valido." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const mission = await ensureMissionBelongsToCampaign(supabase, campaignId, missionId);
    if (!mission) return { success: false, message: "Missione non trovata." };

    const { data: lastEncounter } = await supabase
      .from("mission_encounters")
      .select("sort_order")
      .eq("campaign_id", campaignId)
      .eq("mission_id", missionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder =
      typeof lastEncounter?.sort_order === "number" && Number.isFinite(lastEncounter.sort_order)
        ? Math.max(0, Math.trunc(lastEncounter.sort_order)) + 1
        : 0;

    const { data: created, error } = await supabase
      .from("mission_encounters")
      .insert({
        campaign_id: campaignId,
        mission_id: missionId,
        name,
        notes,
        sort_order: nextSortOrder,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !created) {
      return { success: false, message: error?.message ?? "Errore nella creazione dell'incontro." };
    }

    const loaded = await loadMissionEncounterConfigs(supabase, campaignId, missionId);
    const encounter = loaded.find((row) => row.id === created.id);
    if (!encounter) {
      return { success: false, message: "Incontro creato ma non recuperato correttamente." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true, data: encounter };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function updateMissionEncounterAction(
  campaignId: string,
  encounterId: string,
  payload: { name: string; notes?: string | null }
): Promise<MissionBoardResult> {
  const name = payload.name.trim();
  const notes = payload.notes?.trim() || null;
  if (!campaignId || !encounterId || !name) {
    return { success: false, message: "Dati incontro non validi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const encounter = await ensureEncounterBelongsToCampaign(supabase, campaignId, encounterId);
    if (!encounter) return { success: false, message: "Incontro non trovato." };

    const { error } = await supabase
      .from("mission_encounters")
      .update({
        name,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", encounterId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message ?? "Errore nel salvataggio dell'incontro." };

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function deleteMissionEncounterAction(
  campaignId: string,
  encounterId: string
): Promise<MissionBoardResult> {
  if (!campaignId || !encounterId) {
    return { success: false, message: "Dati incontro non validi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const encounter = await ensureEncounterBelongsToCampaign(supabase, campaignId, encounterId);
    if (!encounter) return { success: false, message: "Incontro non trovato." };

    const { error } = await supabase
      .from("mission_encounters")
      .delete()
      .eq("id", encounterId)
      .eq("campaign_id", campaignId);
    if (error) return { success: false, message: error.message ?? "Errore durante l'eliminazione dell'incontro." };

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

export async function replaceMissionEncounterMonstersAction(
  campaignId: string,
  encounterId: string,
  monsters: MissionEncounterMonsterInput[]
): Promise<MissionBoardResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const encounter = await ensureEncounterBelongsToCampaign(supabase, campaignId, encounterId);
    if (!encounter) return { success: false, message: "Incontro non trovato." };

    const sanitized = monsters
      .map((monster, index) => ({
        wikiEntityId: monster.wikiEntityId,
        quantity: Number.isFinite(monster.quantity) ? Math.max(1, Math.trunc(monster.quantity)) : 1,
        sortOrder: index,
      }))
      .filter((monster) => Boolean(monster.wikiEntityId));

    if (sanitized.length > 0) {
      const ids = [...new Set(sanitized.map((monster) => monster.wikiEntityId))];
      const { data: wikiRows, error: wikiError } = await supabase
        .from("wiki_entities")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("type", "monster")
        .in("id", ids);
      if (wikiError) {
        return { success: false, message: wikiError.message ?? "Errore nella validazione dei mostri." };
      }
      const validIds = new Set((wikiRows ?? []).map((row) => row.id));
      if (validIds.size !== ids.length) {
        return { success: false, message: "Uno o più mostri selezionati non appartengono alla campagna." };
      }
    }

    const { error: deleteError } = await supabase
      .from("mission_encounter_monsters")
      .delete()
      .eq("encounter_id", encounterId);
    if (deleteError) {
      return { success: false, message: deleteError.message ?? "Errore nella pulizia dei mostri incontro." };
    }

    if (sanitized.length > 0) {
      const payload = sanitized.map((monster) => ({
        encounter_id: encounterId,
        wiki_entity_id: monster.wikiEntityId,
        quantity: monster.quantity,
        sort_order: monster.sortOrder,
        updated_at: new Date().toISOString(),
      }));
      const { error: insertError } = await supabase.from("mission_encounter_monsters").insert(payload);
      if (insertError) {
        return { success: false, message: insertError.message ?? "Errore nel salvataggio dei mostri incontro." };
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/gm-screen`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}
