"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";
import { getNotificationsPaused, hasNotificationsDisabled } from "@/lib/player-emails";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";
import type { Json } from "@/types/database.types";
import { backgroundBySlug, raceBySlug } from "@/lib/character-build-catalog";
import { recomputeCharacterRulesSnapshot } from "@/lib/character-rules-snapshot.server";

const CHARACTER_SHEETS_BUCKET = "character_sheets";
const SIGNED_URL_EXPIRY_SEC = 3600;

type CharResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function normalizeCharacterSheetStoragePath(rawPath: string | null | undefined): string | null {
  const p = rawPath?.trim();
  if (!p) return null;

  // Legacy values may contain bucket prefix in DB.
  if (p.startsWith(`${CHARACTER_SHEETS_BUCKET}/`)) {
    return p.slice(CHARACTER_SHEETS_BUCKET.length + 1) || null;
  }

  // Legacy values may contain full storage URLs (public or signed).
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      const u = new URL(p);
      const marker = `/storage/v1/object/`;
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) {
        const tail = u.pathname.slice(idx + marker.length);
        // Tail examples:
        // - public/character_sheets/<path>
        // - sign/character_sheets/<path>
        const segments = tail.split("/").filter(Boolean);
        if (segments.length >= 3 && (segments[0] === "public" || segments[0] === "sign") && segments[1] === CHARACTER_SHEETS_BUCKET) {
          return decodeURIComponent(segments.slice(2).join("/")) || null;
        }
      }
    } catch {
      // Fall through to null for unknown external URL formats.
    }
    return null;
  }

  return p;
}

export type CampaignCharacterRow = {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  character_class: string | null;
  class_subclass?: string | null;
  armor_class?: number | null;
  hit_points?: number | null;
  /** XP correnti del personaggio. */
  current_xp: number;
  /** Livello attuale (1-20). */
  level: number;
  /** Solo per GM/Admin; per i Player non viene mai restituito (null/undefined) */
  sheet_url?: string | null;
  background: string | null;
  assigned_to: string | null;
  /** Ore vissute (Epoch / West Marches). */
  time_offset_hours?: number;
  /** Monete (campagne lunghe): oro, argento, rame. */
  coins_gp?: number;
  coins_sp?: number;
  coins_cp?: number;
  race_slug?: string | null;
  subclass_slug?: string | null;
  background_slug?: string | null;
  rules_snapshot?: Json | null;
  created_at: string;
  updated_at: string;
};

function formSlug(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  if (!v || v === "__none__") return null;
  return v;
}

function normalizeSubraceForRace(raceSlug: string | null, subclassSlug: string | null): string | null {
  if (!raceSlug || !subclassSlug) return null;
  const r = raceBySlug(raceSlug);
  if (!r?.subraces?.some((s) => s.slug === subclassSlug)) return null;
  return subclassSlug;
}

async function getCurrentUserAndRole(): Promise<
  { userId: string; isGmOrAdmin: boolean; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> } | null
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  return { userId: user.id, isGmOrAdmin, supabase };
}

/**
 * GM/Admin: tutti i personaggi della campagna con sheet_url (signed URL).
 * Player: solo il personaggio con assigned_to === user.id; sheet_url non esposto.
 */
export async function getCampaignCharacters(
  campaignId: string
): Promise<CharResult<CampaignCharacterRow[]>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };

  const { userId, isGmOrAdmin, supabase } = ctx;

  if (isGmOrAdmin) {
    const { data: rows, error } = await supabase
      .from("campaign_characters")
      .select(
        "id, campaign_id, name, image_url, character_class, class_subclass, armor_class, hit_points, current_xp, level, sheet_file_path, background, race_slug, subclass_slug, background_slug, rules_snapshot, assigned_to, time_offset_hours, coins_gp, coins_sp, coins_cp, created_at, updated_at"
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getCampaignCharacters]", error);
      return { success: false, error: error.message ?? "Errore nel caricamento." };
    }

    const list = (rows ?? []) as (Omit<CampaignCharacterRow, "sheet_url"> & {
      sheet_file_path: string | null;
    })[];
    const withUrls: CampaignCharacterRow[] = [];

    for (const row of list) {
      let sheet_url: string | null = null;
      if (row.sheet_file_path) {
        const normalizedPath = normalizeCharacterSheetStoragePath(row.sheet_file_path);
        if (normalizedPath) {
          const { data: signed } = await supabase.storage
            .from(CHARACTER_SHEETS_BUCKET)
            .createSignedUrl(normalizedPath, SIGNED_URL_EXPIRY_SEC);
          sheet_url = signed?.signedUrl ?? null;
        }
      }
      const { sheet_file_path: _, ...rest } = row;
      withUrls.push({
        ...rest,
        sheet_url,
        time_offset_hours: typeof rest.time_offset_hours === "number" ? rest.time_offset_hours : 0,
        coins_gp: typeof (rest as { coins_gp?: number }).coins_gp === "number" ? (rest as { coins_gp: number }).coins_gp : 0,
        coins_sp: typeof (rest as { coins_sp?: number }).coins_sp === "number" ? (rest as { coins_sp: number }).coins_sp : 0,
        coins_cp: typeof (rest as { coins_cp?: number }).coins_cp === "number" ? (rest as { coins_cp: number }).coins_cp : 0,
      });
    }

    return { success: true, data: withUrls };
  }

  // Player: solo il proprio PG, senza sheet_url / sheet_file_path
  const { data: rows, error } = await supabase
    .from("campaign_characters")
    .select(
      "id, campaign_id, name, image_url, character_class, class_subclass, current_xp, level, background, race_slug, subclass_slug, background_slug, rules_snapshot, assigned_to, time_offset_hours, coins_gp, coins_sp, coins_cp, created_at, updated_at"
    )
    .eq("campaign_id", campaignId)
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[getCampaignCharacters]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }

  const list: CampaignCharacterRow[] = (rows ?? []).map((r) => ({
    ...r,
    armor_class: null,
    hit_points: null,
    sheet_url: null,
    time_offset_hours:
      typeof (r as { time_offset_hours?: number }).time_offset_hours === "number"
        ? (r as { time_offset_hours: number }).time_offset_hours
        : 0,
    coins_gp: typeof (r as { coins_gp?: number }).coins_gp === "number" ? (r as { coins_gp: number }).coins_gp : 0,
    coins_sp: typeof (r as { coins_sp?: number }).coins_sp === "number" ? (r as { coins_sp: number }).coins_sp : 0,
    coins_cp: typeof (r as { coins_cp?: number }).coins_cp === "number" ? (r as { coins_cp: number }).coins_cp : 0,
  }));
  return { success: true, data: list };
}

/** Solo GM. Crea personaggio: upload immagine (pubblica) e PDF (bucket privato). */
export async function createCharacter(
  campaignId: string,
  formData: FormData
): Promise<CharResult<CampaignCharacterRow>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Solo il Master può creare personaggi." };

  const supabase = ctx.supabase;
  const name = (formData.get("name") as string | null)?.trim();
  const characterClass = (formData.get("character_class") as string | null)?.trim() || null;
  const classSubclass = (formData.get("class_subclass") as string | null)?.trim() || null;
  const armorClassRaw = (formData.get("armor_class") as string | null)?.trim() || "";
  const hitPointsRaw = (formData.get("hit_points") as string | null)?.trim() || "";
  const background = (formData.get("background") as string | null)?.trim() ?? null;
  const raceRaw = formSlug(formData, "race_slug");
  const race_slug = raceBySlug(raceRaw) ? raceRaw : null;
  const subclass_slug = normalizeSubraceForRace(race_slug, formSlug(formData, "subclass_slug"));
  const bgRaw = formSlug(formData, "background_slug");
  const background_slug = backgroundBySlug(bgRaw) ? bgRaw : null;
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromFormRaw = (formData.get("image_url") as string | null)?.trim() || null;
  const imageUrlFromForm =
    imageUrlFromFormRaw && imageUrlFromFormRaw.startsWith("http")
      ? parseSafeExternalUrl(imageUrlFromFormRaw)
      : imageUrlFromFormRaw;
  const sheetFile = formData.get("sheet") as File | null;
  const sheetUrlFromFormRaw = (formData.get("sheet_url") as string | null)?.trim() || null;
  const sheetUrlFromForm = sheetUrlFromFormRaw ? parseSafeExternalUrl(sheetUrlFromFormRaw) : null;

  if (!name) return { success: false, error: "Il nome del personaggio è obbligatorio." };
  const armorClass = armorClassRaw !== "" ? Number.parseInt(armorClassRaw, 10) : null;
  const hitPoints = hitPointsRaw !== "" ? Number.parseInt(hitPointsRaw, 10) : null;
  if (armorClassRaw !== "" && (Number.isNaN(armorClass as number) || (armorClass as number) < 0)) {
    return { success: false, error: "CA non valida." };
  }
  if (hitPointsRaw !== "" && (Number.isNaN(hitPoints as number) || (hitPoints as number) < 0)) {
    return { success: false, error: "PF non validi." };
  }

  let image_url: string | null = null;
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(imageFile.type)) {
      return { success: false, error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF." };
    }
    try {
      const fileId = await uploadToTelegram(imageFile);
      image_url = `/api/tg-image/${encodeURIComponent(fileId)}`;
    } catch (uploadErr) {
      console.error("[createCharacter] Telegram upload", uploadErr);
      return { success: false, error: uploadErr instanceof Error ? uploadErr.message : "Errore caricamento immagine." };
    }
  } else if (imageUrlFromForm) {
    image_url = imageUrlFromForm;
  }
  if (imageUrlFromFormRaw && imageUrlFromFormRaw.startsWith("http") && !imageUrlFromForm) {
    return { success: false, error: "URL immagine non valido o non consentito." };
  }

  let sheet_file_path: string | null = null;
  if (sheetUrlFromFormRaw && !sheetUrlFromForm) {
    return { success: false, error: "URL scheda non valido o non consentito." };
  }
  if (sheetUrlFromForm) {
    sheet_file_path = normalizeCharacterSheetStoragePath(sheetUrlFromForm) ?? sheetUrlFromForm;
  } else if (sheetFile && sheetFile instanceof File && sheetFile.size > 0) {
    if (sheetFile.type !== "application/pdf") {
      return { success: false, error: "La scheda tecnica deve essere un file PDF." };
    }
    const safeName = sheetFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${campaignId}/${randomUUID()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(CHARACTER_SHEETS_BUCKET)
      .upload(path, sheetFile, { contentType: "application/pdf", upsert: false });
    if (uploadErr) {
      console.error("[createCharacter] sheet upload", uploadErr);
      return { success: false, error: uploadErr.message ?? "Errore caricamento PDF." };
    }
    sheet_file_path = path;
  }

  const rules_snapshot = await recomputeCharacterRulesSnapshot({
    campaignId,
    level: 1,
    characterClass: characterClass,
    classSubclass,
    raceSlug: race_slug,
    subclassSlug: subclass_slug,
    backgroundSlug: background_slug,
  });

  const { data: row, error } = await supabase
    .from("campaign_characters")
    .insert({
      campaign_id: campaignId,
      name,
      image_url,
      character_class: characterClass,
      class_subclass: classSubclass,
      armor_class: armorClass,
      hit_points: hitPoints,
      sheet_file_path,
      background,
      race_slug,
      subclass_slug,
      background_slug,
      rules_snapshot: rules_snapshot as unknown as Json,
      assigned_to: null,
    })
    .select(
      "id, campaign_id, name, image_url, character_class, class_subclass, armor_class, hit_points, current_xp, level, background, race_slug, subclass_slug, background_slug, rules_snapshot, assigned_to, created_at, updated_at"
    )
    .single();

  if (error) {
    console.error("[createCharacter]", error);
    if (sheet_file_path) await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([sheet_file_path]);
    return { success: false, error: error.message ?? "Errore nella creazione." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: { ...row, sheet_url: null } as CampaignCharacterRow };
}

/** Solo GM. Aggiorna nome, avatar, scheda PDF e background di un personaggio. */
export async function updateCharacter(
  characterId: string,
  campaignId: string,
  formData: FormData
): Promise<CharResult<CampaignCharacterRow>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Solo il Master può modificare personaggi." };

  const supabase = ctx.supabase;
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { success: false, error: "Il nome del personaggio è obbligatorio." };

  const characterClass = (formData.get("character_class") as string | null)?.trim() || null;
  const classSubclass = (formData.get("class_subclass") as string | null)?.trim() || null;
  const levelRaw = (formData.get("level") as string | null)?.trim() || "";
  const armorClassRaw = (formData.get("armor_class") as string | null)?.trim() || "";
  const hitPointsRaw = (formData.get("hit_points") as string | null)?.trim() || "";
  const armorClass = armorClassRaw !== "" ? Number.parseInt(armorClassRaw, 10) : null;
  const hitPoints = hitPointsRaw !== "" ? Number.parseInt(hitPointsRaw, 10) : null;
  if (armorClassRaw !== "" && (Number.isNaN(armorClass as number) || (armorClass as number) < 0)) {
    return { success: false, error: "CA non valida." };
  }
  if (hitPointsRaw !== "" && (Number.isNaN(hitPoints as number) || (hitPoints as number) < 0)) {
    return { success: false, error: "PF non validi." };
  }

  const background = (formData.get("background") as string | null)?.trim() ?? null;
  const raceRaw = formSlug(formData, "race_slug");
  const race_slug = raceBySlug(raceRaw) ? raceRaw : null;
  const subclass_slug = normalizeSubraceForRace(race_slug, formSlug(formData, "subclass_slug"));
  const bgRaw = formSlug(formData, "background_slug");
  const background_slug = backgroundBySlug(bgRaw) ? bgRaw : null;
  const { data: campaignRow } = await supabase
    .from("campaigns")
    .select("type")
    .eq("id", campaignId)
    .single();
  const isLong = campaignRow?.type === "long";

  const coinsGpRaw = (formData.get("coins_gp") as string | null)?.trim() ?? "0";
  const coinsSpRaw = (formData.get("coins_sp") as string | null)?.trim() ?? "0";
  const coinsCpRaw = (formData.get("coins_cp") as string | null)?.trim() ?? "0";
  const coinsGp = Number.parseInt(coinsGpRaw, 10);
  const coinsSp = Number.parseInt(coinsSpRaw, 10);
  const coinsCp = Number.parseInt(coinsCpRaw, 10);
  if (
    isLong &&
    (Number.isNaN(coinsGp) || coinsGp < 0 || Number.isNaN(coinsSp) || coinsSp < 0 || Number.isNaN(coinsCp) || coinsCp < 0)
  ) {
    return { success: false, error: "Monete non valide (numeri interi ≥ 0)." };
  }
  const removeImage = formData.get("remove_image") === "on";
  const removeSheet = formData.get("remove_sheet") === "on";
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromFormRaw = (formData.get("image_url") as string | null)?.trim() || null;
  const imageUrlFromForm =
    imageUrlFromFormRaw && imageUrlFromFormRaw.startsWith("http")
      ? parseSafeExternalUrl(imageUrlFromFormRaw)
      : imageUrlFromFormRaw;
  const sheetFile = formData.get("sheet") as File | null;
  const sheetUrlFromFormRaw = (formData.get("sheet_url") as string | null)?.trim() || null;
  const sheetUrlFromForm = sheetUrlFromFormRaw ? parseSafeExternalUrl(sheetUrlFromFormRaw) : null;

  const { data: existing, error: fetchErr } = await supabase
    .from("campaign_characters")
    .select("image_url, sheet_file_path, level")
    .eq("id", characterId)
    .single();

  if (fetchErr || !existing) return { success: false, error: "Personaggio non trovato." };
  const prevLevel = typeof (existing as { level?: number }).level === "number" ? (existing as { level: number }).level : 1;
  let nextLevel = prevLevel;
  if (levelRaw !== "") {
    const parsed = Number.parseInt(levelRaw, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 20) {
      return { success: false, error: "Livello non valido (consentito: 1-20)." };
    }
    if (parsed < prevLevel) {
      return { success: false, error: "Puoi solo aumentare manualmente il livello del personaggio." };
    }
    nextLevel = parsed;
  }
  if (nextLevel >= 3 && !classSubclass) {
    return { success: false, error: "Dal livello 3 in poi seleziona una sottoclasse." };
  }

  let image_url: string | null = existing.image_url;
  if (removeImage) {
    image_url = null;
  } else if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(imageFile.type)) {
      return { success: false, error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF." };
    }
    try {
      const fileId = await uploadToTelegram(imageFile);
      image_url = `/api/tg-image/${encodeURIComponent(fileId)}`;
    } catch (uploadErr) {
      console.error("[updateCharacter] Telegram upload", uploadErr);
      return { success: false, error: uploadErr instanceof Error ? uploadErr.message : "Errore caricamento immagine." };
    }
  } else if (imageUrlFromForm) {
    image_url = imageUrlFromForm;
  }
  if (imageUrlFromFormRaw && imageUrlFromFormRaw.startsWith("http") && !imageUrlFromForm) {
    return { success: false, error: "URL immagine non valido o non consentito." };
  }

  let sheet_file_path: string | null = (existing as { sheet_file_path: string | null }).sheet_file_path;
  if (removeSheet) {
    const normalizedPrevPath = normalizeCharacterSheetStoragePath(sheet_file_path);
    if (normalizedPrevPath) {
      await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([normalizedPrevPath]);
    }
    sheet_file_path = null;
  } else if (sheetUrlFromFormRaw && !sheetUrlFromForm) {
    return { success: false, error: "URL scheda non valido o non consentito." };
  } else if (sheetUrlFromForm) {
    const normalizedPrevPath = normalizeCharacterSheetStoragePath(sheet_file_path);
    if (normalizedPrevPath) {
      await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([normalizedPrevPath]);
    }
    sheet_file_path = normalizeCharacterSheetStoragePath(sheetUrlFromForm) ?? sheetUrlFromForm;
  } else if (sheetFile && sheetFile instanceof File && sheetFile.size > 0) {
    if (sheetFile.type !== "application/pdf") {
      return { success: false, error: "La scheda tecnica deve essere un file PDF." };
    }
    const normalizedPrevPath = normalizeCharacterSheetStoragePath(sheet_file_path);
    if (normalizedPrevPath) {
      await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([normalizedPrevPath]);
    }
    const safeName = sheetFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${campaignId}/${randomUUID()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(CHARACTER_SHEETS_BUCKET)
      .upload(path, sheetFile, { contentType: "application/pdf", upsert: false });
    if (uploadErr) {
      console.error("[updateCharacter] sheet upload", uploadErr);
      return { success: false, error: uploadErr.message ?? "Errore caricamento PDF." };
    }
    sheet_file_path = path;
  }

  const rules_snapshot = await recomputeCharacterRulesSnapshot({
    campaignId,
    level: nextLevel,
    characterClass,
    classSubclass,
    raceSlug: race_slug,
    subclassSlug: subclass_slug,
    backgroundSlug: background_slug,
  });

  const { data: row, error } = await supabase
    .from("campaign_characters")
    .update({
      name,
      image_url,
      character_class: characterClass,
      class_subclass: classSubclass,
      armor_class: armorClass,
      hit_points: hitPoints,
      sheet_file_path,
      level: nextLevel,
      background,
      race_slug,
      subclass_slug,
      background_slug,
      rules_snapshot: rules_snapshot as unknown as Json,
      ...(isLong ? { coins_gp: coinsGp, coins_sp: coinsSp, coins_cp: coinsCp } : {}),
    })
    .eq("id", characterId)
    .select(
      "id, campaign_id, name, image_url, character_class, class_subclass, armor_class, hit_points, current_xp, level, background, race_slug, subclass_slug, background_slug, rules_snapshot, assigned_to, coins_gp, coins_sp, coins_cp, created_at, updated_at"
    )
    .single();

  if (error) {
    console.error("[updateCharacter]", error);
    return { success: false, error: error.message ?? "Errore nell'aggiornamento." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: { ...row, sheet_url: null } as CampaignCharacterRow };
}

/** Solo GM. Assegna un personaggio a un giocatore. */
export async function assignCharacter(
  characterId: string,
  playerId: string | null
): Promise<CharResult<void>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Solo il Master può assegnare personaggi." };

  const supabase = ctx.supabase;

  const { data: char, error: fetchErr } = await supabase
    .from("campaign_characters")
    .select("campaign_id, name")
    .eq("id", characterId)
    .single();

  if (fetchErr || !char) return { success: false, error: "Personaggio non trovato." };

  const { error } = await supabase
    .from("campaign_characters")
    .update({ assigned_to: playerId || null })
    .eq("id", characterId);

  if (error) {
    console.error("[assignCharacter]", error);
    return { success: false, error: error.message ?? "Errore nell'assegnazione." };
  }

  if (playerId) {
    try {
      const paused = await getNotificationsPaused();
      const optedOut = await hasNotificationsDisabled(playerId);
      if (!paused && !optedOut) {
        const admin = createSupabaseAdminClient();
        const { data: authUser } = await admin.auth.admin.getUserById(playerId);
        const toEmail = authUser?.user?.email;
        if (toEmail) {
          void sendEmail({
            to: toEmail,
            subject: `Ti è stato assegnato un Personaggio: ${char.name}`,
            html: wrapInTemplate(
              `<p>Il Master ti ha assegnato il personaggio <strong>${escapeHtml(char.name)}</strong>.</p><p>Scopri il tuo background e la tua scheda sul sito.</p>`
            ),
          });
        }
      }
    } catch (mailErr) {
      console.error("[assignCharacter] invio email:", mailErr);
    }
  }

  revalidatePath(`/campaigns/${char.campaign_id}`);
  return { success: true };
}

/** Solo GM. Elimina personaggio e file associati. */
export async function deleteCharacter(characterId: string): Promise<CharResult<{ campaignId: string }>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Solo il Master può eliminare personaggi." };

  const supabase = ctx.supabase;

  const { data: row, error: fetchErr } = await supabase
    .from("campaign_characters")
    .select("campaign_id, sheet_file_path")
    .eq("id", characterId)
    .single();

  if (fetchErr || !row) return { success: false, error: "Personaggio non trovato." };

  const normalizedSheetPath = normalizeCharacterSheetStoragePath(row.sheet_file_path);
  if (normalizedSheetPath) {
    await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([normalizedSheetPath]);
  }

  const { error: delErr } = await supabase.from("campaign_characters").delete().eq("id", characterId);
  if (delErr) {
    console.error("[deleteCharacter]", delErr);
    return { success: false, error: delErr.message ?? "Errore nell'eliminazione." };
  }

  revalidatePath(`/campaigns/${row.campaign_id}`);
  return { success: true, data: { campaignId: row.campaign_id } };
}

export type EligiblePlayer = { id: string; label: string };

/** Incrementa di 1 il livello del personaggio (max 20). Solo GM/Admin; aggiorna anche `rules_snapshot`. */
export async function levelUpCharacter(
  characterId: string
): Promise<CharResult<{ campaignId: string; newLevel: number }>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  const { isGmOrAdmin, supabase } = ctx;
  if (!isGmOrAdmin) {
    return { success: false, error: "Solo il Master o un admin può confermare il passaggio di livello." };
  }

  const { data: row, error } = await supabase
    .from("campaign_characters")
    .select("campaign_id, level, character_class, class_subclass, race_slug, subclass_slug, background_slug")
    .eq("id", characterId)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: "Personaggio non trovato." };
  }

  const currentLevel = typeof row.level === "number" ? row.level : 1;
  if (currentLevel >= 20) {
    return { success: false, error: "Il personaggio è già al livello massimo." };
  }

  const newLevel = currentLevel + 1;
  const classSubclass = (row as { class_subclass?: string | null }).class_subclass ?? null;
  if (newLevel >= 3 && !classSubclass?.trim()) {
    return {
      success: false,
      error: "Per passare al livello 3 o superiore devi prima selezionare la sottoclasse nella modifica del personaggio.",
    };
  }
  const rules_snapshot = await recomputeCharacterRulesSnapshot({
    campaignId: row.campaign_id,
    level: newLevel,
    characterClass: (row as { character_class?: string | null }).character_class ?? null,
    classSubclass,
    raceSlug: (row as { race_slug?: string | null }).race_slug ?? null,
    subclassSlug: (row as { subclass_slug?: string | null }).subclass_slug ?? null,
    backgroundSlug: (row as { background_slug?: string | null }).background_slug ?? null,
  });
  const { error: updateError } = await supabase
    .from("campaign_characters")
    .update({ level: newLevel, rules_snapshot: rules_snapshot as unknown as Json })
    .eq("id", characterId);

  if (updateError) {
    console.error("[levelUpCharacter]", updateError);
    return { success: false, error: updateError.message ?? "Errore durante il passaggio di livello." };
  }

  revalidatePath(`/campaigns/${row.campaign_id}`);
  return { success: true, data: { campaignId: row.campaign_id, newLevel } };
}

/**
 * Solo GM/Admin. Restituisce i giocatori iscritti e approvati (o che hanno partecipato)
 * alle sessioni della campagna, più i membri campagna, per la Select di assegnazione PG.
 */
export async function getCampaignEligiblePlayers(
  campaignId: string
): Promise<CharResult<EligiblePlayer[]>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Non autorizzato." };

  const supabase = ctx.supabase;

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("campaign_id", campaignId);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const playerIds = new Set<string>();

  if (sessionIds.length > 0) {
    const { data: signups } = await supabase
      .from("session_signups")
      .select("player_id")
      .in("session_id", sessionIds)
      .in("status", ["approved", "attended"]);
    (signups ?? []).forEach((s) => playerIds.add(s.player_id));
  }

  const { data: members } = await supabase
    .from("campaign_members")
    .select("player_id")
    .eq("campaign_id", campaignId);
  (members ?? []).forEach((m) => playerIds.add(m.player_id));

  const ids = Array.from(playerIds);
  if (ids.length === 0) {
    return { success: true, data: [] };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name")
    .in("id", ids);

  const list: EligiblePlayer[] = (profiles ?? []).map((p: { id: string; first_name: string | null; last_name: string | null; display_name: string | null }) => {
    const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    const label = full || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`;
    return { id: p.id, label };
  });

  list.sort((a, b) => a.label.localeCompare(b.label));
  return { success: true, data: list };
}

export type ForceCharacterTimeSyncResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * GM/Admin: sovrascrive le ore Epoch del personaggio (sincronizzazione forzata).
 */
export async function forceCharacterTimeSync(
  characterId: string,
  newTime: number
): Promise<ForceCharacterTimeSyncResult> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Solo GM o Admin." };
  const id = characterId?.trim();
  if (!id) return { success: false, error: "Personaggio non valido." };

  const hours = Number.isFinite(newTime) ? Math.max(0, Math.floor(newTime)) : 0;

  const supabase = ctx.supabase;
  const admin = createSupabaseAdminClient();

  const { data: me } = await supabase.from("profiles").select("role").eq("id", ctx.userId).single();
  const isAdmin = me?.role === "admin";

  const { data: rowRaw, error: fetchErr } = await admin
    .from("campaign_characters")
    .select("id, campaign_id")
    .eq("id", id)
    .maybeSingle();

  const row = rowRaw as { id: string; campaign_id: string } | null;
  if (fetchErr || !row) {
    return { success: false, error: fetchErr?.message ?? "Personaggio non trovato." };
  }

  const { data: camp } = await supabase
    .from("campaigns")
    .select("gm_id")
    .eq("id", row.campaign_id)
    .single();

  if (!isAdmin && camp?.gm_id !== ctx.userId) {
    return { success: false, error: "Non sei il Master di questa campagna." };
  }

  const { error: updErr } = await admin
    .from("campaign_characters")
    .update({ time_offset_hours: hours } as never)
    .eq("id", id);

  if (updErr) {
    console.error("[forceCharacterTimeSync]", updErr);
    return { success: false, error: updErr.message ?? "Errore durante l'aggiornamento." };
  }

  revalidatePath(`/campaigns/${row.campaign_id}`);
  revalidatePath("/dashboard");
  return { success: true, message: "Timeline del personaggio aggiornata." };
}

/**
 * GM/Admin: aggiorna la posizione sulla griglia mondo (West Marches / mappa GM).
 */
export async function updateCharacterGridPositionAction(
  campaignId: string,
  characterId: string,
  gridX: number,
  gridY: number
): Promise<CharResult<void>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) {
    return { success: false, error: "Solo il Master può spostare i personaggi sulla mappa." };
  }

  const supabase = ctx.supabase;
  const posX = Math.trunc(gridX);
  const posY = Math.trunc(gridY);

  const { error } = await supabase
    .from("campaign_characters")
    .update({
      pos_x_grid: posX,
      pos_y_grid: posY,
      updated_at: new Date().toISOString(),
    })
    .eq("id", characterId)
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("[updateCharacterGridPositionAction]", error);
    return { success: false, error: error.message ?? "Errore nell'aggiornamento della posizione." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

/**
 * GM/Admin: aggiorna la posizione sulla griglia per piu personaggi (es. intero gruppo).
 */
export async function updateCharactersGridPositionAction(
  campaignId: string,
  characterIds: string[],
  gridX: number,
  gridY: number
): Promise<CharResult<void>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) {
    return { success: false, error: "Solo il Master può spostare i personaggi sulla mappa." };
  }
  const ids = [...new Set(characterIds.filter(Boolean))];
  if (ids.length === 0) {
    return { success: false, error: "Seleziona almeno un personaggio." };
  }

  const supabase = ctx.supabase;
  const posX = Math.trunc(gridX);
  const posY = Math.trunc(gridY);

  const { error } = await supabase
    .from("campaign_characters")
    .update({
      pos_x_grid: posX,
      pos_y_grid: posY,
      updated_at: new Date().toISOString(),
    })
    .eq("campaign_id", campaignId)
    .in("id", ids);

  if (error) {
    console.error("[updateCharactersGridPositionAction]", error);
    return { success: false, error: error.message ?? "Errore nell'aggiornamento delle posizioni." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

/** Solo GM/Admin. Salva un PDF generato come scheda tecnica del PG. Opzionalmente aggiorna CA/PF con i valori dell’anteprima generata. */
export async function saveGeneratedSheetToCharacter(
  campaignId: string,
  characterId: string,
  pdfBase64: string,
  fileName: string,
  combatFromSheet?: { armorClass: number; hitPoints: number } | null
): Promise<CharResult<void>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  if (!ctx.isGmOrAdmin) return { success: false, error: "Solo il Master può salvare schede tecniche." };
  const supabase = ctx.supabase;

  const cid = campaignId.trim();
  const chid = characterId.trim();
  if (!cid || !chid) return { success: false, error: "Campagna o personaggio non validi." };
  if (!pdfBase64.trim()) return { success: false, error: "PDF non valido." };

  const { data: row, error: fetchErr } = await supabase
    .from("campaign_characters")
    .select("id, campaign_id, sheet_file_path")
    .eq("id", chid)
    .eq("campaign_id", cid)
    .single();
  if (fetchErr || !row) return { success: false, error: "Personaggio non trovato." };

  let bytes: Buffer;
  try {
    bytes = Buffer.from(pdfBase64, "base64");
  } catch {
    return { success: false, error: "Impossibile decodificare il PDF." };
  }
  if (!bytes.length) return { success: false, error: "PDF vuoto." };

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "scheda-generata.pdf";
  const path = `${cid}/${randomUUID()}-${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from(CHARACTER_SHEETS_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadErr) return { success: false, error: uploadErr.message ?? "Errore upload PDF." };

  const prevPath = row.sheet_file_path;
  const ac = combatFromSheet?.armorClass;
  const hp = combatFromSheet?.hitPoints;
  const updateRow: { sheet_file_path: string; armor_class?: number; hit_points?: number; updated_at: string } = {
    sheet_file_path: path,
    updated_at: new Date().toISOString(),
  };
  if (typeof ac === "number" && Number.isFinite(ac) && ac >= 0) {
    updateRow.armor_class = Math.trunc(ac);
  }
  if (typeof hp === "number" && Number.isFinite(hp) && hp >= 0) {
    updateRow.hit_points = Math.trunc(hp);
  }
  const { error: updateErr } = await supabase.from("campaign_characters").update(updateRow).eq("id", chid);
  if (updateErr) {
    await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([path]);
    return { success: false, error: updateErr.message ?? "Errore salvataggio scheda." };
  }
  const normalizedPrevPath = normalizeCharacterSheetStoragePath(prevPath);
  if (normalizedPrevPath) {
    await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([normalizedPrevPath]);
  }

  revalidatePath(`/campaigns/${cid}`);
  return { success: true };
}
