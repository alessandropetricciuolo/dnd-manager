"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/types/database.types";

/** ID achievement incrementale "Veterano del Tavolo" (N sessioni con presenza confermata). */
const SESSIONS_ATTENDED_ACHIEVEMENT_ID = "b0000002-0002-4000-8000-000000000002";

type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];
type AvatarRow = Database["public"]["Tables"]["avatars"]["Row"];
type PlayerAchievementRow = Database["public"]["Tables"]["player_achievements"]["Row"];

type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
} & (T extends void ? {} : { data?: T });

async function getAdminSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Non autenticato.", supabase: null as any };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Solo admin.", supabase: null as any };
  }

  return { error: null, supabase };
}

// ============================================
// ACHIEVEMENTS
// ============================================

export async function listAchievements(): Promise<ActionResult<AchievementRow[]>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const { data, error: dbError } = await supabase
    .from("achievements")
    .select("*")
    .order("created_at", { ascending: true });

  if (dbError) {
    console.error("[listAchievements]", dbError);
    return { success: false, message: dbError.message ?? "Errore nel caricamento.", data: [] };
  }

  return { success: true, data: (data ?? []) as AchievementRow[] };
}

type UpsertAchievementInput = {
  id?: string;
  title: string;
  description?: string;
  points: number;
  icon_name?: string;
  is_incremental?: boolean;
  max_progress?: number;
  category?: string;
};

export async function upsertAchievement(input: UpsertAchievementInput): Promise<ActionResult<AchievementRow>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const payload: Partial<AchievementRow> = {
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    points: Math.max(0, Math.floor(input.points)),
    icon_name: (input.icon_name || "Award").trim() || "Award",
    is_incremental: !!input.is_incremental,
    max_progress: input.is_incremental
      ? Math.max(1, Math.floor(input.max_progress ?? 1))
      : 1,
    category: (input.category ?? "Generale").trim() || "Generale",
  };

  const query = supabase
    .from("achievements")
    .upsert(
      input.id
        ? { id: input.id, ...payload }
        : payload,
      { onConflict: "id" }
    )
    .select("*")
    .single();

  const { data, error: dbError } = await query;
  if (dbError) {
    console.error("[upsertAchievement]", dbError);
    return { success: false, message: dbError.message ?? "Errore nel salvataggio." };
  }

  revalidatePath("/admin/gamification");
  return { success: true, data: data as AchievementRow };
}

export async function deleteAchievement(id: string): Promise<ActionResult<void>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const { error: dbError } = await supabase.from("achievements").delete().eq("id", id);
  if (dbError) {
    console.error("[deleteAchievement]", dbError);
    return { success: false, message: dbError.message ?? "Errore durante l'eliminazione." };
  }

  revalidatePath("/admin/gamification");
  return { success: true };
}

// ============================================
// AVATARS
// ============================================

export async function listAvatars(): Promise<ActionResult<AvatarRow[]>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const { data, error: dbError } = await supabase
    .from("avatars")
    .select("*")
    .order("created_at", { ascending: true });

  if (dbError) {
    console.error("[listAvatars]", dbError);
    return { success: false, message: dbError.message ?? "Errore nel caricamento.", data: [] };
  }

  return { success: true, data: (data ?? []) as AvatarRow[] };
}

type UpsertAvatarInput = {
  id?: string;
  name: string;
  image_url: string;
  is_default?: boolean;
  required_achievement_id?: string | null;
};

export async function upsertAvatar(input: UpsertAvatarInput): Promise<ActionResult<AvatarRow>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const payload: Partial<AvatarRow> = {
    name: input.name.trim(),
    image_url: input.image_url.trim(),
    is_default: !!input.is_default,
    required_achievement_id: input.is_default ? null : input.required_achievement_id ?? null,
  };

  const query = supabase
    .from("avatars")
    .upsert(
      input.id
        ? { id: input.id, ...payload }
        : payload,
      { onConflict: "id" }
    )
    .select("*")
    .single();

  const { data, error: dbError } = await query;
  if (dbError) {
    console.error("[upsertAvatar]", dbError);
    return { success: false, message: dbError.message ?? "Errore nel salvataggio avatar." };
  }

  revalidatePath("/admin/gamification");
  return { success: true, data: data as AvatarRow };
}

export async function deleteAvatar(id: string): Promise<ActionResult<void>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const { error: dbError } = await supabase.from("avatars").delete().eq("id", id);
  if (dbError) {
    console.error("[deleteAvatar]", dbError);
    return { success: false, message: dbError.message ?? "Errore durante l'eliminazione avatar." };
  }

  revalidatePath("/admin/gamification");
  return { success: true };
}

// ============================================
// PLAYER ACHIEVEMENTS / PROGRESSO
// ============================================

type PlayerAchievementInput = {
  player_id: string;
  achievement_id: string;
};

type UpdateProgressInput = PlayerAchievementInput & {
  current_progress: number;
};

/** Internal: esegue l'aggiornamento per un singolo giocatore (usa client già autenticato). */
async function updatePlayerAchievementProgressWithClient(
  supabase: Awaited<ReturnType<typeof getAdminSupabase>>["supabase"],
  input: UpdateProgressInput
): Promise<ActionResult<PlayerAchievementRow>> {
  if (!supabase) return { success: false, message: "Client non disponibile." };

  const { player_id, achievement_id } = input;
  if (!player_id || !achievement_id) {
    return { success: false, message: "Player e achievement sono obbligatori." };
  }

  const { data: achievement, error: achError } = await supabase
    .from("achievements")
    .select("id, points, is_incremental, max_progress")
    .eq("id", achievement_id)
    .single();

  if (achError || !achievement) {
    console.error("[updatePlayerAchievementProgress] achievement", achError);
    return { success: false, message: "Achievement non trovato." };
  }

  const maxProgress =
    achievement.max_progress && achievement.max_progress > 0
      ? achievement.max_progress
      : 1;

  const requested = Number.isFinite(input.current_progress)
    ? input.current_progress
    : maxProgress;

  const clampedProgress = Math.max(0, Math.floor(Math.min(requested, maxProgress)));

  const { data: existing, error: existingError } = await supabase
    .from("player_achievements")
    .select("id, current_progress, is_unlocked")
    .eq("player_id", player_id)
    .eq("achievement_id", achievement_id)
    .maybeSingle();

  if (existingError) {
    console.error("[updatePlayerAchievementProgress] existing", existingError);
    return { success: false, message: "Errore nel leggere il progresso." };
  }

  const wasUnlocked = existing?.is_unlocked === true;
  const willBeUnlocked = clampedProgress >= maxProgress;

  const payload: Partial<PlayerAchievementRow> = {
    player_id,
    achievement_id,
    current_progress: clampedProgress,
    is_unlocked: willBeUnlocked,
    unlocked_at: willBeUnlocked ? new Date().toISOString() : null,
  };

  let upserted: PlayerAchievementRow | null = null;

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabase
      .from("player_achievements")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("[updatePlayerAchievementProgress] update", updateError);
      return { success: false, message: updateError.message ?? "Errore aggiornando il progresso." };
    }
    upserted = updated as PlayerAchievementRow;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("player_achievements")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      console.error("[updatePlayerAchievementProgress] insert", insertError);
      return { success: false, message: "Errore salvando il progresso." };
    }
    upserted = inserted as PlayerAchievementRow;
  }

  if (!wasUnlocked && willBeUnlocked) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("fame_score")
      .eq("id", player_id)
      .single();

    if (profileError) {
      console.error("[updatePlayerAchievementProgress] profile", profileError);
    } else {
      const currentFame = (profile?.fame_score as number | null) ?? 0;
      const newFame = currentFame + (achievement.points ?? 0);
      const { error: fameError } = await supabase
        .from("profiles")
        .update({ fame_score: newFame })
        .eq("id", player_id);
      if (fameError) {
        console.error("[updatePlayerAchievementProgress] fame_score", fameError);
      }
    }
  }

  return {
    success: true,
    data: upserted ?? undefined,
  };
}

export async function unlockPlayerAchievementFully(
  input: PlayerAchievementInput
): Promise<ActionResult<PlayerAchievementRow>> {
  const { success, message, data } = await updatePlayerAchievementProgress({
    ...input,
    current_progress: Number.POSITIVE_INFINITY,
  });
  return { success, message, data };
}


export async function updatePlayerAchievementProgress(
  input: UpdateProgressInput
): Promise<ActionResult<PlayerAchievementRow>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const result = await updatePlayerAchievementProgressWithClient(supabase, input);
  if (!result.success) return result;

  revalidatePath("/admin/gamification");
  revalidatePath("/hall-of-fame");
  return result;
}

type BulkProgressInput = {
  player_ids: string[];
  achievement_id: string;
  current_progress: number;
};

type BulkResult = { ok: number; fail: number };

export async function updatePlayerAchievementProgressBulk(
  input: BulkProgressInput
): Promise<ActionResult<BulkResult>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const { player_ids, achievement_id, current_progress } = input;
  if (!achievement_id || !player_ids?.length) {
    return { success: false, message: "Seleziona almeno un giocatore e un achievement." };
  }

  let ok = 0;
  let fail = 0;
  let firstMessage: string | undefined;

  for (const player_id of player_ids) {
    const res = await updatePlayerAchievementProgressWithClient(supabase, {
      player_id,
      achievement_id,
      current_progress,
    });
    if (res.success) ok++;
    else {
      fail++;
      if (!firstMessage) firstMessage = res.message;
    }
  }

  revalidatePath("/admin/gamification");
  revalidatePath("/hall-of-fame");

  return {
    success: true,
    data: { ok, fail },
    message:
      fail > 0
        ? `Completato: ${ok} aggiornati, ${fail} errori.${firstMessage ? ` Primo errore: ${firstMessage}` : ""}`
        : undefined,
  };
}

export async function unlockPlayerAchievementFullyBulk(input: {
  player_ids: string[];
  achievement_id: string;
}): Promise<ActionResult<BulkResult>> {
  const { error, supabase } = await getAdminSupabase();
  if (error) return { success: false, message: error };

  const { player_ids, achievement_id } = input;
  if (!achievement_id || !player_ids?.length) {
    return { success: false, message: "Seleziona almeno un giocatore e un achievement." };
  }

  let ok = 0;
  let fail = 0;
  let firstMessage: string | undefined;

  for (const player_id of player_ids) {
    const res = await updatePlayerAchievementProgressWithClient(supabase, {
      player_id,
      achievement_id,
      current_progress: Number.POSITIVE_INFINITY,
    });
    if (res.success) ok++;
    else {
      fail++;
      if (!firstMessage) firstMessage = res.message;
    }
  }

  revalidatePath("/admin/gamification");
  revalidatePath("/hall-of-fame");

  return {
    success: true,
    data: { ok, fail },
    message:
      fail > 0
        ? `Completato: ${ok} sbloccati, ${fail} errori.${firstMessage ? ` Primo errore: ${firstMessage}` : ""}`
        : undefined,
  };
}

// ============================================
// SESSIONI: incremento presenze e sync achievement (chiamato da campaign actions)
// ============================================

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Incrementa sessions_attended_count del giocatore e aggiorna l'achievement "Veterano del Tavolo".
 * Usare solo quando si conferma presenza (attended) per la prima volta per quella sessione.
 * Chiamare con client admin (es. da updateSignupStatus / closeSession).
 */
export async function incrementSessionsAttendedWithAdmin(
  admin: AdminClient,
  playerId: string
): Promise<{ success: boolean; message?: string }> {
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("sessions_attended_count")
    .eq("id", playerId)
    .single();

  if (profileErr || profile == null) {
    console.error("[incrementSessionsAttendedWithAdmin] profile", profileErr);
    return { success: false, message: "Profilo non trovato." };
  }

  const currentCount = (profile as { sessions_attended_count?: number }).sessions_attended_count ?? 0;
  const newCount = currentCount + 1;

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ sessions_attended_count: newCount } as never)
    .eq("id", playerId);

  if (updateErr) {
    console.error("[incrementSessionsAttendedWithAdmin] update profile", updateErr);
    return { success: false, message: updateErr.message ?? "Errore aggiornando il contatore." };
  }

  const progressResult = await updatePlayerAchievementProgressWithClient(admin, {
    player_id: playerId,
    achievement_id: SESSIONS_ATTENDED_ACHIEVEMENT_ID,
    current_progress: newCount,
  });

  if (!progressResult.success) {
    console.warn("[incrementSessionsAttendedWithAdmin] achievement sync", progressResult.message);
  }

  revalidatePath("/hall-of-fame");
  revalidatePath("/admin/gamification");
  return { success: true };
}

// ============================================
// APPLICA TROFEI DA WIZARD CHIUSURA SESSIONE (con client admin da campaign action)
// ============================================

export type AwardedAchievementInput = {
  player_id: string;
  achievement_id: string;
  added_progress: number;
};

/**
 * Applica un achievement assegnato dal wizard: binario → sblocca; incrementale → somma added_progress al current e sblocca se raggiunge max.
 * Usare con client admin (es. da closeSessionAction).
 */
export async function applyAwardedAchievementWithAdmin(
  admin: AdminClient,
  input: AwardedAchievementInput
): Promise<ActionResult<void>> {
  const { player_id, achievement_id, added_progress } = input;
  if (!player_id || !achievement_id) {
    return { success: false, message: "Player e achievement sono obbligatori." };
  }

  const { data: achievementRaw, error: achError } = await admin
    .from("achievements")
    .select("id, is_incremental, max_progress")
    .eq("id", achievement_id)
    .single();

  if (achError || !achievementRaw) {
    console.error("[applyAwardedAchievementWithAdmin] achievement", achError);
    return { success: false, message: "Achievement non trovato." };
  }

  const achievement = achievementRaw as { id: string; is_incremental: boolean; max_progress: number };
  const maxProgress = achievement.max_progress && achievement.max_progress > 0 ? achievement.max_progress : 1;

  if (!achievement.is_incremental) {
    return updatePlayerAchievementProgressWithClient(admin, {
      player_id,
      achievement_id,
      current_progress: maxProgress,
    }) as Promise<ActionResult<void>>;
  }

  const { data: existingRaw, error: existingError } = await admin
    .from("player_achievements")
    .select("id, current_progress")
    .eq("player_id", player_id)
    .eq("achievement_id", achievement_id)
    .maybeSingle();

  if (existingError) {
    console.error("[applyAwardedAchievementWithAdmin] existing", existingError);
    return { success: false, message: "Errore nel leggere il progresso." };
  }

  const existing = existingRaw as { id: string; current_progress: number } | null;
  const current = existing?.current_progress ?? 0;
  const add = Math.max(0, Math.floor(added_progress));
  const newProgress = Math.min(current + add, maxProgress);

  return updatePlayerAchievementProgressWithClient(admin, {
    player_id,
    achievement_id,
    current_progress: newProgress,
  }) as Promise<ActionResult<void>>;
}
