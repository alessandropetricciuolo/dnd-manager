"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { uploadToTelegram } from "@/lib/telegram-storage";

const PORTRAITS_BUCKET = "portraits";
const AVATARS_BUCKET = "avatars";
const LETHALITY_VALUES = ["Bassa", "Media", "Alta", "Implacabile"] as const;

export type UpdateGmProfileResult = { success: boolean; message: string };

function clampStat(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function extractLegacyPortraitStoragePath(url: string, userId: string): string | null {
  const marker = `/storage/v1/object/public/${PORTRAITS_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;
  const rawPath = url.slice(markerIndex + marker.length).trim();
  const decodedPath = rawPath
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
  return decodedPath.startsWith(`${userId}/`) ? decodedPath : null;
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
          const path = extractLegacyPortraitStoragePath(currentPortraitUrl, user.id);
          if (path) {
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

      try {
        const fileId = await uploadToTelegram(portraitFile, username ?? user.id, "photo");
        portraitUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;
      } catch (uploadError) {
        console.error("[updateGmPublicProfile] Telegram upload", uploadError);
        return {
          success: false,
          message:
            uploadError instanceof Error
              ? uploadError.message
              : "Errore nel caricamento del ritratto.",
        };
      }

      if (currentPortraitUrl && currentPortraitUrl !== portraitUrl) {
        try {
          const oldPath = extractLegacyPortraitStoragePath(currentPortraitUrl, user.id);
          if (oldPath) {
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
  const avatarUrlFromGallery = (formData.get("avatar_url") as string | null)?.trim() || null;
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
      avatarUrl = null;
    } else if (avatarUrlFromGallery) {
      avatarUrl = avatarUrlFromGallery;
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
