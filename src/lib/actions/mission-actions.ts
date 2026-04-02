"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { parseGuildRank, rankFromPoints } from "@/lib/missions/guild-ranks";

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

function isMissingMissionProgressColumns(err: { message?: string } | null): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("points_reward") ||
    m.includes("status") ||
    m.includes("schema cache") ||
    m.includes("column")
  );
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
