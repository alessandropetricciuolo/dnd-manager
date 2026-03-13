"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";
import { getNotificationsPaused, hasNotificationsDisabled } from "@/lib/player-emails";
import { uploadToTelegram } from "@/lib/telegram-storage";

const CHARACTER_SHEETS_BUCKET = "character_sheets";
const SIGNED_URL_EXPIRY_SEC = 3600;

type CharResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type CampaignCharacterRow = {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  /** XP correnti del personaggio. */
  current_xp: number;
  /** Livello attuale (1-20). */
  level: number;
  /** Solo per GM/Admin; per i Player non viene mai restituito (null/undefined) */
  sheet_url?: string | null;
  background: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

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
      .select("id, campaign_id, name, image_url, current_xp, level, sheet_file_path, background, assigned_to, created_at, updated_at")
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
        if (row.sheet_file_path.startsWith("http")) {
          sheet_url = row.sheet_file_path;
        } else {
          const { data: signed } = await supabase.storage
            .from(CHARACTER_SHEETS_BUCKET)
            .createSignedUrl(row.sheet_file_path, SIGNED_URL_EXPIRY_SEC);
          sheet_url = signed?.signedUrl ?? null;
        }
      }
      const { sheet_file_path: _, ...rest } = row;
      withUrls.push({ ...rest, sheet_url });
    }

    return { success: true, data: withUrls };
  }

  // Player: solo il proprio PG, senza sheet_url / sheet_file_path
  const { data: rows, error } = await supabase
    .from("campaign_characters")
    .select("id, campaign_id, name, image_url, current_xp, level, background, assigned_to, created_at, updated_at")
    .eq("campaign_id", campaignId)
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[getCampaignCharacters]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }

  const list: CampaignCharacterRow[] = (rows ?? []).map((r) => ({ ...r, sheet_url: null }));
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
  const background = (formData.get("background") as string | null)?.trim() ?? null;
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromForm = (formData.get("image_url") as string | null)?.trim() || null;
  const sheetFile = formData.get("sheet") as File | null;
  const sheetUrlFromForm = (formData.get("sheet_url") as string | null)?.trim() || null;

  if (!name) return { success: false, error: "Il nome del personaggio è obbligatorio." };

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

  let sheet_file_path: string | null = null;
  if (sheetUrlFromForm) {
    if (!/^https?:\/\/.+/.test(sheetUrlFromForm)) {
      return { success: false, error: "L'URL della scheda deve iniziare con https:// (o http://)." };
    }
    sheet_file_path = sheetUrlFromForm;
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

  const { data: row, error } = await supabase
    .from("campaign_characters")
    .insert({
      campaign_id: campaignId,
      name,
      image_url,
      sheet_file_path,
      background,
      assigned_to: null,
    })
    .select("id, campaign_id, name, image_url, background, assigned_to, created_at, updated_at")
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

  const background = (formData.get("background") as string | null)?.trim() ?? null;
  const removeImage = formData.get("remove_image") === "on";
  const removeSheet = formData.get("remove_sheet") === "on";
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromForm = (formData.get("image_url") as string | null)?.trim() || null;
  const sheetFile = formData.get("sheet") as File | null;
  const sheetUrlFromForm = (formData.get("sheet_url") as string | null)?.trim() || null;

  const { data: existing, error: fetchErr } = await supabase
    .from("campaign_characters")
    .select("image_url, sheet_file_path")
    .eq("id", characterId)
    .single();

  if (fetchErr || !existing) return { success: false, error: "Personaggio non trovato." };

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

  let sheet_file_path: string | null = (existing as { sheet_file_path: string | null }).sheet_file_path;
  if (removeSheet) {
    if (sheet_file_path && !sheet_file_path.startsWith("http")) {
      await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([sheet_file_path]);
    }
    sheet_file_path = null;
  } else if (sheetUrlFromForm) {
    if (!/^https?:\/\/.+/.test(sheetUrlFromForm)) {
      return { success: false, error: "L'URL della scheda deve iniziare con https:// (o http://)." };
    }
    if (sheet_file_path && !sheet_file_path.startsWith("http")) {
      await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([sheet_file_path]);
    }
    sheet_file_path = sheetUrlFromForm;
  } else if (sheetFile && sheetFile instanceof File && sheetFile.size > 0) {
    if (sheetFile.type !== "application/pdf") {
      return { success: false, error: "La scheda tecnica deve essere un file PDF." };
    }
    if (sheet_file_path && !sheet_file_path.startsWith("http")) {
      await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([sheet_file_path]);
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

  const { data: row, error } = await supabase
    .from("campaign_characters")
    .update({
      name,
      image_url,
      sheet_file_path,
      background,
    })
    .eq("id", characterId)
    .select("id, campaign_id, name, image_url, background, assigned_to, created_at, updated_at")
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

  if (row.sheet_file_path && !row.sheet_file_path.startsWith("http")) {
    await supabase.storage.from(CHARACTER_SHEETS_BUCKET).remove([row.sheet_file_path]);
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

/** Incrementa di 1 il livello del personaggio (max 20). Consentito a GM/Admin o al proprietario del PG. */
export async function levelUpCharacter(
  characterId: string
): Promise<CharResult<{ campaignId: string; newLevel: number }>> {
  const ctx = await getCurrentUserAndRole();
  if (!ctx) return { success: false, error: "Non autenticato." };
  const { userId, isGmOrAdmin, supabase } = ctx;

  const { data: row, error } = await supabase
    .from("campaign_characters")
    .select("campaign_id, assigned_to, level")
    .eq("id", characterId)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: "Personaggio non trovato." };
  }

  const canEdit = isGmOrAdmin || row.assigned_to === userId;
  if (!canEdit) {
    return { success: false, error: "Non sei autorizzato a far salire di livello questo personaggio." };
  }

  const currentLevel = typeof row.level === "number" ? row.level : 1;
  if (currentLevel >= 20) {
    return { success: false, error: "Il personaggio è già al livello massimo." };
  }

  const newLevel = currentLevel + 1;
  const { error: updateError } = await supabase
    .from("campaign_characters")
    .update({ level: newLevel })
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
