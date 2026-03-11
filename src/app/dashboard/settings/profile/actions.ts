"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const PORTRAITS_BUCKET = "portraits";
const LETHALITY_VALUES = ["Bassa", "Media", "Alta", "Implacabile"] as const;

export type UpdateGmProfileResult = { success: boolean; message: string };

function clampStat(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function updateGmPublicProfile(formData: FormData): Promise<UpdateGmProfileResult> {
  const usernameRaw = (formData.get("username") as string | null)?.trim() || null;
  const username = usernameRaw === "" ? null : usernameRaw;
  const bio = (formData.get("bio") as string | null)?.trim() || null;
  const isGmPublic = formData.get("is_gm_public") === "on";
  const statCombatRaw = formData.get("stat_combat");
  const statRoleplayRaw = formData.get("stat_roleplay");
  const statLethalityRaw = (formData.get("stat_lethality") as string | null)?.trim() || "Media";
  const portraitFile = formData.get("portrait") as File | null;
  const removePortrait = formData.get("remove_portrait") === "on";

  const statCombat =
    typeof statCombatRaw === "string"
      ? clampStat(Number(statCombatRaw))
      : typeof statCombatRaw === "number"
        ? clampStat(statCombatRaw)
        : 50;
  const statRoleplay =
    typeof statRoleplayRaw === "string"
      ? clampStat(Number(statRoleplayRaw))
      : typeof statRoleplayRaw === "number"
        ? clampStat(statRoleplayRaw)
        : 50;
  const statLethality = LETHALITY_VALUES.includes(statLethalityRaw as (typeof LETHALITY_VALUES)[number])
    ? (statLethalityRaw as (typeof LETHALITY_VALUES)[number])
    : "Media";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono modificare il profilo pubblico." };
    }

    if (isGmPublic && username) {
      const normalized = username.toLowerCase().trim();
      if (normalized.length < 2) {
        return { success: false, message: "Lo username deve avere almeno 2 caratteri." };
      }
      const escaped = normalized.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .not("id", "eq", user.id)
        .ilike("username", escaped);
      if (existing && existing.length > 0) {
        return { success: false, message: "Questo username è già in uso. Scegline un altro." };
      }
    }

    let portraitUrl: string | null = null;
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("portrait_url")
      .eq("id", user.id)
      .single();
    const currentPortraitUrl = currentProfile?.portrait_url ?? null;

    if (removePortrait) {
      if (currentPortraitUrl) {
        try {
          const path = currentPortraitUrl.split("/").slice(-2).join("/");
          if (path.startsWith(user.id)) {
            await supabase.storage.from(PORTRAITS_BUCKET).remove([path]);
          }
        } catch {
          // ignore
        }
      }
      portraitUrl = null;
    } else if (portraitFile && portraitFile.size > 0) {
      const ext = portraitFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const allowed = ["jpg", "jpeg", "png", "webp"];
      if (!allowed.includes(ext)) {
        return { success: false, message: "Formato immagine non supportato. Usa JPG, PNG o WebP." };
      }
      const path = `${user.id}/portrait.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PORTRAITS_BUCKET)
        .upload(path, portraitFile, { contentType: portraitFile.type, upsert: true });

      if (uploadError) {
        console.error("[updateGmPublicProfile] upload", uploadError);
        return {
          success: false,
          message: uploadError.message ?? "Errore nel caricamento del ritratto.",
        };
      }

      const { data: urlData } = supabase.storage.from(PORTRAITS_BUCKET).getPublicUrl(path);
      portraitUrl = urlData.publicUrl;

      if (currentPortraitUrl && currentPortraitUrl !== portraitUrl) {
        try {
          const oldPath = currentPortraitUrl.split("/").slice(-2).join("/");
          if (oldPath.startsWith(user.id)) {
            await supabase.storage.from(PORTRAITS_BUCKET).remove([oldPath]);
          }
        } catch {
          // ignore
        }
      }
    } else if (currentPortraitUrl) {
      portraitUrl = currentPortraitUrl;
    }

    const updatePayload: Record<string, unknown> = {
      username: username || null,
      bio: bio || null,
      is_gm_public: isGmPublic,
      stat_combat: statCombat,
      stat_roleplay: statRoleplay,
      stat_lethality: statLethality,
    };
    if (portraitUrl !== undefined) {
      updatePayload.portrait_url = portraitUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, message: "Questo username è già in uso." };
      }
      console.error("[updateGmPublicProfile]", updateError);
      return {
        success: false,
        message: updateError.message ?? "Errore durante il salvataggio.",
      };
    }

    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/profile");
    if (username) {
      revalidatePath(`/master/${encodeURIComponent(username)}`);
    }
    revalidatePath("/masters");
    return { success: true, message: "Profilo pubblico aggiornato." };
  } catch (err) {
    console.error("[updateGmPublicProfile]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type UpdatePlayerProfileResult = { success: boolean; message: string };

export async function updatePlayerProfile(formData: FormData): Promise<UpdatePlayerProfileResult> {
  const nicknameRaw = (formData.get("nickname") as string | null)?.trim() || null;
  const nickname = nicknameRaw === "" ? null : nicknameRaw;
  const isPlayerPublic = formData.get("is_player_public") === "on";
  const notificationsDisabled = formData.get("notifications_disabled") === "on";
  const avatarFile = formData.get("avatar") as File | null;
  const removeAvatar = formData.get("remove_avatar") === "on";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "player" && profile?.role !== "admin") {
      return { success: false, message: "Solo i giocatori possono modificare il profilo da questa pagina." };
    }

    if (nickname) {
      const trimmed = nickname.trim();
      if (trimmed.length < 2) {
        return { success: false, message: "Il nickname deve avere almeno 2 caratteri." };
      }
    }

    let avatarUrl: string | null = null;
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();
    const currentAvatarUrl = (currentProfile?.avatar_url as string | null) ?? null;

    if (removeAvatar) {
      if (currentAvatarUrl) {
        try {
          const path = currentAvatarUrl.split("/").slice(-2).join("/");
          if (path.startsWith(user.id)) {
            await supabase.storage.from(PORTRAITS_BUCKET).remove([path]);
          }
        } catch {
          /* ignore */
        }
      }
      avatarUrl = null;
    } else if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const allowed = ["jpg", "jpeg", "png", "webp"];
      if (!allowed.includes(ext)) {
        return { success: false, message: "Formato immagine non supportato. Usa JPG, PNG o WebP." };
      }
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PORTRAITS_BUCKET)
        .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });

      if (uploadError) {
        console.error("[updatePlayerProfile] upload", uploadError);
        return {
          success: false,
          message: uploadError.message ?? "Errore nel caricamento dell'avatar.",
        };
      }

      const { data: urlData } = supabase.storage.from(PORTRAITS_BUCKET).getPublicUrl(path);
      avatarUrl = urlData.publicUrl;

      if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
        try {
          const oldPath = currentAvatarUrl.split("/").slice(-2).join("/");
          if (oldPath.startsWith(user.id)) {
            await supabase.storage.from(PORTRAITS_BUCKET).remove([oldPath]);
          }
        } catch {
          /* ignore */
        }
      }
    } else if (currentAvatarUrl) {
      avatarUrl = currentAvatarUrl;
    }

    const updatePayload: Record<string, unknown> = {
      nickname: nickname || null,
      is_player_public: isPlayerPublic,
      notifications_disabled: notificationsDisabled,
    };
    if (avatarUrl !== undefined) {
      updatePayload.avatar_url = avatarUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, message: "Questo nickname è già in uso." };
      }
      console.error("[updatePlayerProfile]", updateError);
      return {
        success: false,
        message: updateError.message ?? "Errore durante il salvataggio.",
      };
    }

    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/profile");
    revalidatePath("/hall-of-fame");
    return { success: true, message: "Profilo aggiornato." };
  } catch (err) {
    console.error("[updatePlayerProfile]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}
