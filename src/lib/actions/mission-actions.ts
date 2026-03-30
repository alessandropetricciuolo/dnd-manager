"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

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
  grade: number,
  score: number
): Promise<MissionBoardResult> {
  const trimmedName = name.trim();
  if (!campaignId || !trimmedName) {
    return { success: false, message: "Dati gilda non validi." };
  }

  const normalizedGrade = Number.isFinite(grade) ? Math.trunc(grade) : 0;
  const normalizedScore = Number.isFinite(score) ? Math.trunc(score) : 0;

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    // Upsert per evitare duplicati su (campaign_id, name)
    const { error } = await supabase.from("campaign_guilds").upsert(
      {
        campaign_id: campaignId,
        name: trimmedName,
        grade: normalizedGrade,
        score: normalizedScore,
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
  grade: number,
  score: number
): Promise<MissionBoardResult> {
  const trimmedName = name.trim();
  if (!campaignId || !guildId || !trimmedName) {
    return { success: false, message: "Dati gilda non validi." };
  }

  const normalizedGrade = Number.isFinite(grade) ? Math.trunc(grade) : 0;
  const normalizedScore = Number.isFinite(score) ? Math.trunc(score) : 0;

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase
      .from("campaign_guilds")
      .update({
        name: trimmedName,
        grade: normalizedGrade,
        score: normalizedScore,
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
  description: string
): Promise<MissionBoardResult> {
  const g = grade.trim();
  const t = title.trim();
  const c = committente.trim();
  const u = ubicazione.trim();
  const p = paga.trim();
  const urg = urgenza.trim();
  const d = description.trim();

  if (!campaignId || !g || !t || !c || !u || !p || !urg || !d) {
    return { success: false, message: "Compila tutti i campi missione." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase.from("campaign_missions").insert({
      campaign_id: campaignId,
      grade: g,
      title: t,
      committente: c,
      ubicazione: u,
      paga: p,
      urgenza: urg,
      description: d,
      updated_at: new Date().toISOString(),
    });

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
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
  description: string
): Promise<MissionBoardResult> {
  const g = grade.trim();
  const t = title.trim();
  const c = committente.trim();
  const u = ubicazione.trim();
  const p = paga.trim();
  const urg = urgenza.trim();
  const d = description.trim();

  if (!campaignId || !missionId || !g || !t || !c || !u || !p || !urg || !d) {
    return { success: false, message: "Compila tutti i campi missione." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase
      .from("campaign_missions")
      .update({
        grade: g,
        title: t,
        committente: c,
        ubicazione: u,
        paga: p,
        urgenza: urg,
        description: d,
        updated_at: new Date().toISOString(),
      })
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

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

    const { error } = await supabase
      .from("campaign_missions")
      .delete()
      .eq("id", missionId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

