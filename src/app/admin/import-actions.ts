"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

/** Se l'URL è un link Google Drive, restituisce il direct link per visualizzazione (export=view). Altrimenti l'URL originale. */
function convertDriveLink(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("drive.google.com")) return trimmed;
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileId = match?.[1];
  if (!fileId) return trimmed;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

type ImportCampaignFullResult = { success: true; campaignId: string } | { success: false; error: string };

/** Formato JSON atteso per l'import. */
export type ImportCampaignJson = {
  campaign?: {
    name: string;
    description?: string | null;
    is_public?: boolean;
    type?: "oneshot" | "quest" | "long" | null;
    image_url?: string | null;
  };
  wiki?: Array<{
    name: string;
    type: "npc" | "monster" | "item" | "location" | "lore";
    content?: { body?: string } | string | Record<string, unknown>;
    image_url?: string | null;
    attributes?: Record<string, unknown>;
    is_secret?: boolean;
    sort_order?: number | null;
  }>;
  maps?: Array<{
    name: string;
    description?: string | null;
    image_url?: string | null;
  }>;
  characters?: Array<{
    name: string;
    image_url?: string | null;
    sheet_url?: string | null;
    background?: string | null;
  }>;
  gm_secrets?: Array<{
    title: string;
    content?: string | null;
    files?: Array<{ url?: string | null; file_name?: string | null }>;
  }>;
};

export async function importCampaignFull(json: ImportCampaignJson): Promise<ImportCampaignFullResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Non autenticato." };
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return { success: false, error: "Solo gli admin possono importare campagne." };
    }

    const gmId = user.id;
    const campaignData = json.campaign;
    if (!campaignData?.name?.trim()) {
      return { success: false, error: "Il JSON deve contenere campaign.name." };
    }

    // —— Step A: Campagna ——
    const campaignInsert = {
      gm_id: gmId,
      name: campaignData.name.trim(),
      description: campaignData.description ?? null,
      is_public: campaignData.is_public ?? false,
      type: campaignData.type ?? null,
      image_url: convertDriveLink(campaignData.image_url) ?? null,
    };

    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .insert(campaignInsert as never)
      .select("id")
      .single();

    if (campaignError || !campaign) {
      console.error("[importCampaignFull] campaign", campaignError);
      return { success: false, error: campaignError?.message ?? "Errore creazione campagna." };
    }

    const campaignId = campaign.id;

    // —— Step B: Wiki ——
    const wikiList = json.wiki ?? [];
    for (const w of wikiList) {
      if (!w.name?.trim() || !w.type) continue;
      const content =
        typeof w.content === "object" && w.content !== null && "body" in w
          ? (w.content as { body?: string })
          : typeof w.content === "string"
            ? { body: w.content }
            : { body: "" };
      const { error: wikiErr } = await admin.from("wiki_entities").insert({
        campaign_id: campaignId,
        name: w.name.trim(),
        type: w.type,
        content: content as { body?: string },
        image_url: convertDriveLink(w.image_url) ?? null,
        attributes: w.attributes ?? {},
        is_secret: w.is_secret ?? false,
        sort_order: w.sort_order ?? null,
      } as never);
      if (wikiErr) {
        console.error("[importCampaignFull] wiki", w.name, wikiErr);
      }
    }

    // —— Step C: Mappe ——
    const mapsList = json.maps ?? [];
    for (const m of mapsList) {
      if (!m.name?.trim()) continue;
      const imageUrl = convertDriveLink(m.image_url);
      const { error: mapErr } = await admin.from("maps").insert({
        campaign_id: campaignId,
        name: m.name.trim(),
        description: m.description ?? null,
        image_url: imageUrl ?? "",
      } as never);
      if (mapErr) {
        console.error("[importCampaignFull] map", m.name, mapErr);
      }
    }

    // —— Step D: Personaggi (PG) ——
    const charactersList = json.characters ?? [];
    for (const c of charactersList) {
      if (!c.name?.trim()) continue;
      const imageUrl = convertDriveLink(c.image_url);
      const sheetUrl = c.sheet_url?.trim() || null;
      const { error: charErr } = await admin.from("campaign_characters").insert({
        campaign_id: campaignId,
        name: c.name.trim(),
        image_url: imageUrl ?? null,
        sheet_file_path: sheetUrl,
        background: c.background ?? null,
        assigned_to: null,
      } as never);
      if (charErr) {
        console.error("[importCampaignFull] character", c.name, charErr);
      }
    }

    // —— Step E: Area GM (Note + Allegati) ——
    const gmSecretsList = json.gm_secrets ?? [];
    for (const g of gmSecretsList) {
      if (!g.title?.trim()) continue;
      const { error: noteErr } = await admin.from("gm_notes").insert({
        campaign_id: campaignId,
        title: g.title.trim(),
        content: g.content ?? "",
      } as never);
      if (noteErr) {
        console.error("[importCampaignFull] gm_note", g.title, noteErr);
      }

      const files = g.files ?? [];
      for (const f of files) {
        const fileUrl = f.url?.trim() || null;
        const fileName = f.file_name?.trim() || "Documento";
        if (!fileUrl) continue;
        const { error: attErr } = await admin.from("gm_attachments").insert({
          campaign_id: campaignId,
          file_path: fileUrl,
          file_name: fileName,
          mime_type: null,
          file_size: null,
        } as never);
        if (attErr) {
          console.error("[importCampaignFull] gm_attachment", fileName, attErr);
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, campaignId };
  } catch (err) {
    console.error("[importCampaignFull]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Errore imprevisto durante l'import.",
    };
  }
}
