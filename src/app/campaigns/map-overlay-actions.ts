"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { parseMapOverlayItems } from "@/lib/maps/overlay-parse";
import type { MapOverlayItem } from "@/types/map-overlay";

async function assertLongCampaignGm(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  campaignId: string,
  profileRole: string | undefined
): Promise<{ ok: true; campaign: { type: string; gm_id: string } } | { ok: false; message: string }> {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("type, gm_id")
    .eq("id", campaignId)
    .single();
  if (error || !campaign) {
    return { ok: false, message: "Campagna non trovata." };
  }
  const c = campaign as { type?: string; gm_id?: string };
  if (c.type !== "long") {
    return { ok: false, message: "Le annotazioni mappa sono solo per campagne lunghe." };
  }
  const isAdmin = profileRole === "admin";
  const isGmOwner = c.gm_id === userId;
  if (!isAdmin && !isGmOwner) {
    return { ok: false, message: "Solo il GM della campagna (o admin) può modificare le annotazioni." };
  }
  return { ok: true, campaign: { type: c.type ?? "long", gm_id: c.gm_id ?? "" } };
}

export type MapOverlayActionResult = { success: true; message?: string } | { success: false; message: string };

export async function saveMapOverlayDraftAction(
  campaignId: string,
  mapId: string,
  items: unknown
): Promise<MapOverlayActionResult> {
  const parsed = parseMapOverlayItems(items);
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = (profile as { role?: string } | null)?.role;

    const gate = await assertLongCampaignGm(supabase, user.id, campaignId, role);
    if (!gate.ok) return { success: false, message: gate.message };

    const { error: mapErr } = await supabase
      .from("maps")
      .select("id")
      .eq("id", mapId)
      .eq("campaign_id", campaignId)
      .single();
    if (mapErr) return { success: false, message: "Mappa non trovata." };

    const { error } = await supabase
      .from("maps")
      .update({ overlay_draft: parsed as unknown as MapOverlayItem[] })
      .eq("id", mapId)
      .eq("campaign_id", campaignId);

    if (error) {
      console.error("[saveMapOverlayDraftAction]", error);
      return { success: false, message: error.message ?? "Salvataggio non riuscito." };
    }

    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}`);
    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}/overlay-edit`);
    return { success: true, message: "Bozza salvata." };
  } catch (e) {
    console.error("[saveMapOverlayDraftAction]", e);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function publishMapOverlayAction(
  campaignId: string,
  mapId: string,
  note: string | null,
  /** Se inviato, sostituisce bozza/DB come stato da pubblicare. */
  itemsFromClient?: unknown | null
): Promise<MapOverlayActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = (profile as { role?: string } | null)?.role;

    const gate = await assertLongCampaignGm(supabase, user.id, campaignId, role);
    if (!gate.ok) return { success: false, message: gate.message };

    const { data: mapRow, error: mapErr } = await supabase
      .from("maps")
      .select("overlay_items, overlay_draft")
      .eq("id", mapId)
      .eq("campaign_id", campaignId)
      .single();
    if (mapErr || !mapRow) return { success: false, message: "Mappa non trovata." };

    const current = mapRow as { overlay_items?: unknown; overlay_draft?: unknown };
    const toPublish =
      itemsFromClient !== undefined && itemsFromClient !== null
        ? parseMapOverlayItems(itemsFromClient)
        : current.overlay_draft != null
          ? parseMapOverlayItems(current.overlay_draft)
          : parseMapOverlayItems(current.overlay_items);

    const previousPublished = parseMapOverlayItems(current.overlay_items);

    const { error: snapErr } = await supabase.from("map_overlay_snapshots").insert({
      map_id: mapId,
      overlay_items: previousPublished as unknown as MapOverlayItem[],
      note: note?.trim()?.slice(0, 200) || null,
      created_by: user.id,
    });
    if (snapErr) {
      console.error("[publishMapOverlayAction] snapshot", snapErr);
      return { success: false, message: snapErr.message ?? "Errore storico." };
    }

    const { error: updErr } = await supabase
      .from("maps")
      .update({
        overlay_items: toPublish as unknown as MapOverlayItem[],
        overlay_draft: null,
      })
      .eq("id", mapId)
      .eq("campaign_id", campaignId);

    if (updErr) {
      console.error("[publishMapOverlayAction]", updErr);
      return { success: false, message: updErr.message ?? "Pubblicazione fallita." };
    }

    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}`);
    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}/view`);
    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}/overlay-edit`);
    return { success: true, message: "Annotazioni pubblicate. Visibili a tutti i lettori della mappa." };
  } catch (e) {
    console.error("[publishMapOverlayAction]", e);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function discardMapOverlayDraftAction(
  campaignId: string,
  mapId: string
): Promise<MapOverlayActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = (profile as { role?: string } | null)?.role;

    const gate = await assertLongCampaignGm(supabase, user.id, campaignId, role);
    if (!gate.ok) return { success: false, message: gate.message };

    const { error } = await supabase
      .from("maps")
      .update({ overlay_draft: null })
      .eq("id", mapId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}/overlay-edit`);
    return { success: true, message: "Bozza scartata." };
  } catch (e) {
    console.error("[discardMapOverlayDraftAction]", e);
    return { success: false, message: "Errore imprevisto." };
  }
}

export type OverlaySnapshotRow = {
  id: string;
  created_at: string;
  note: string | null;
};

export async function listMapOverlaySnapshotsAction(
  campaignId: string,
  mapId: string
): Promise<{ success: true; rows: OverlaySnapshotRow[] } | { success: false; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = (profile as { role?: string } | null)?.role;

    const gate = await assertLongCampaignGm(supabase, user.id, campaignId, role);
    if (!gate.ok) return { success: false, message: gate.message };

    const { data, error } = await supabase
      .from("map_overlay_snapshots")
      .select("id, created_at, note")
      .eq("map_id", mapId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return { success: false, message: error.message };
    return { success: true, rows: (data ?? []) as OverlaySnapshotRow[] };
  } catch (e) {
    console.error("[listMapOverlaySnapshotsAction]", e);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function restoreMapOverlaySnapshotToDraftAction(
  campaignId: string,
  mapId: string,
  snapshotId: string
): Promise<MapOverlayActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = (profile as { role?: string } | null)?.role;

    const gate = await assertLongCampaignGm(supabase, user.id, campaignId, role);
    if (!gate.ok) return { success: false, message: gate.message };

    const { data: snap, error: snapErr } = await supabase
      .from("map_overlay_snapshots")
      .select("overlay_items")
      .eq("id", snapshotId)
      .eq("map_id", mapId)
      .single();
    if (snapErr || !snap) return { success: false, message: "Snapshot non trovato." };

    const items = parseMapOverlayItems((snap as { overlay_items?: unknown }).overlay_items);

    const { error } = await supabase
      .from("maps")
      .update({ overlay_draft: items as unknown as MapOverlayItem[] })
      .eq("id", mapId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, message: error.message };

    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}/overlay-edit`);
    return { success: true, message: "Bozza ripristinata dallo storico. Pubblica per renderla visibile a tutti." };
  } catch (e) {
    console.error("[restoreMapOverlaySnapshotToDraftAction]", e);
    return { success: false, message: "Errore imprevisto." };
  }
}
