"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const CHARACTER_SHEETS_BUCKET = "character_sheets";
const WIKI_IMAGES_BUCKET = "campaign_maps";
const SIGNED_URL_EXPIRY_SEC = 3600;

/** Path per avatar PG: pubblico in campaign_maps */
const CHARACTER_AVATAR_PREFIX = "characters";

type CharResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type CampaignCharacterRow = {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
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
      .select("id, campaign_id, name, image_url, sheet_file_path, background, assigned_to, created_at, updated_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getCampaignCharacters]", error);
      return { success: false, error: error.message ?? "Errore nel caricamento." };
    }

    const list = (rows ?? []) as (Omit<CampaignCharacterRow, "sheet_url"> & { sheet_file_path: string | null })[];
    const withUrls: CampaignCharacterRow[] = [];

    for (const row of list) {
      let sheet_url: string | null = null;
      if (row.sheet_file_path) {
        const { data: signed } = await supabase.storage
          .from(CHARACTER_SHEETS_BUCKET)
          .createSignedUrl(row.sheet_file_path, SIGNED_URL_EXPIRY_SEC);
        sheet_url = signed?.signedUrl ?? null;
      }
      const { sheet_file_path: _, ...rest } = row;
      withUrls.push({ ...rest, sheet_url });
    }

    return { success: true, data: withUrls };
  }

  // Player: solo il proprio PG, senza sheet_url / sheet_file_path
  const { data: rows, error } = await supabase
    .from("campaign_characters")
    .select("id, campaign_id, name, image_url, background, assigned_to, created_at, updated_at")
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
  const sheetFile = formData.get("sheet") as File | null;

  if (!name) return { success: false, error: "Il nome del personaggio è obbligatorio." };

  let image_url: string | null = null;
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(imageFile.type)) {
      return { success: false, error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF." };
    }
    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${campaignId}/${CHARACTER_AVATAR_PREFIX}/${randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(WIKI_IMAGES_BUCKET)
      .upload(path, imageFile, { cacheControl: "3600", upsert: false });
    if (uploadErr) {
      console.error("[createCharacter] image upload", uploadErr);
      return { success: false, error: uploadErr.message ?? "Errore caricamento immagine." };
    }
    const { data: urlData } = supabase.storage.from(WIKI_IMAGES_BUCKET).getPublicUrl(path);
    image_url = urlData.publicUrl;
  }

  let sheet_file_path: string | null = null;
  if (sheetFile && sheetFile instanceof File && sheetFile.size > 0) {
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
    .select("campaign_id")
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

  if (row.sheet_file_path) {
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
