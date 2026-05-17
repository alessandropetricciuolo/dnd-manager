"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";
import { recomputeCharacterRulesSnapshot } from "@/lib/character-rules-snapshot.server";
import { syncCharacterBackgroundToCampaignMemory } from "@/lib/campaign-memory-indexer";

const CHARACTER_SHEETS_BUCKET = "character_sheets";
const LIBRARY_KEY = "barber_and_dragons";

export type CharacterCatalogRow = {
  id: string;
  slug: string;
  library_key: string;
  name: string;
  character_class: string | null;
  class_subclass: string | null;
  armor_class: number | null;
  hit_points: number | null;
  background: string | null;
  race_slug: string | null;
  subclass_slug: string | null;
  background_slug: string | null;
  image_url: string | null;
  sheet_file_path: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogImportFailure = { catalogId: string; name: string; error: string };

type GmSession = { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> };

async function getGmOrAdminSession(): Promise<GmSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) return null;
  return { supabase };
}

function normalizeCharacterSheetStoragePath(rawPath: string | null | undefined): string | null {
  const p = rawPath?.trim();
  if (!p) return null;
  if (p.startsWith(`${CHARACTER_SHEETS_BUCKET}/`)) {
    return p.slice(CHARACTER_SHEETS_BUCKET.length + 1) || null;
  }
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      const u = new URL(p);
      const marker = `/storage/v1/object/`;
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) {
        const tail = u.pathname.slice(idx + marker.length);
        const segments = tail.split("/").filter(Boolean);
        if (
          segments.length >= 3 &&
          (segments[0] === "public" || segments[0] === "sign") &&
          segments[1] === CHARACTER_SHEETS_BUCKET
        ) {
          return decodeURIComponent(segments.slice(2).join("/")) || null;
        }
      }
    } catch {
      return null;
    }
    return null;
  }
  return p;
}

/**
 * Lista PG nel catalogo globale Barber & Dragons (GM/Admin).
 */
export async function listCharacterCatalogForImport(): Promise<
  { success: true; data: CharacterCatalogRow[] } | { success: false; error: string }
> {
  const ctx = await getGmOrAdminSession();
  if (!ctx) return { success: false, error: "Non autenticato o permessi insufficienti." };

  const { data, error } = await ctx.supabase
    .from("character_catalog")
    .select(
      "id, slug, library_key, name, character_class, class_subclass, armor_class, hit_points, background, race_slug, subclass_slug, background_slug, image_url, sheet_file_path, created_at, updated_at"
    )
    .eq("library_key", LIBRARY_KEY)
    .order("name", { ascending: true });

  if (error) {
    console.error("[listCharacterCatalogForImport]", error);
    return { success: false, error: error.message ?? "Errore lettura catalogo." };
  }

  return { success: true, data: (data ?? []) as CharacterCatalogRow[] };
}

/**
 * Copia dal catalogo alla campagna lo stesso risultato di creazione manuale PG (storage scheda + insert + memoria campagna).
 */
export async function importCatalogEntriesToCampaign(
  campaignId: string,
  catalogEntryIds: string[]
): Promise<
  | { success: true; imported: number; failures: CatalogImportFailure[] }
  | { success: false; error: string }
> {
  const ctx = await getGmOrAdminSession();
  if (!ctx) return { success: false, error: "Non autenticato o permessi insufficienti." };

  const ids = [...new Set(catalogEntryIds.map((x) => x.trim()).filter(Boolean))];
  if (!ids.length) return { success: false, error: "Seleziona almeno un personaggio." };

  const { data: rows, error: fetchErr } = await ctx.supabase
    .from("character_catalog")
    .select(
      "id, slug, library_key, name, character_class, class_subclass, armor_class, hit_points, background, race_slug, subclass_slug, background_slug, image_url, sheet_file_path, created_at, updated_at"
    )
    .eq("library_key", LIBRARY_KEY)
    .in("id", ids);

  if (fetchErr) {
    console.error("[importCatalogEntriesToCampaign] fetch", fetchErr);
    return { success: false, error: fetchErr.message ?? "Errore lettura catalogo." };
  }

  const byId = new Map((rows as CharacterCatalogRow[] | null)?.map((r) => [r.id, r]) ?? []);
  const failures: CatalogImportFailure[] = [];
  let imported = 0;

  const admin = createSupabaseAdminClient();

  for (const id of ids) {
    const catalog = byId.get(id);
    if (!catalog) {
      failures.push({ catalogId: id, name: "?", error: "Voce catalogo non trovata." });
      continue;
    }

    if (!catalog.image_url?.trim()) {
      failures.push({ catalogId: id, name: catalog.name, error: "Manca immagine nel catalogo." });
      continue;
    }
    const sheetRaw = catalog.sheet_file_path?.trim();
    if (!sheetRaw) {
      failures.push({ catalogId: id, name: catalog.name, error: "Manca scheda PDF nel catalogo." });
      continue;
    }

    const sheetPath = normalizeCharacterSheetStoragePath(sheetRaw);
    if (!sheetPath) {
      failures.push({ catalogId: id, name: catalog.name, error: "Path scheda PDF non valido." });
      continue;
    }

    const { data: fileBlob, error: dlErr } = await admin.storage.from(CHARACTER_SHEETS_BUCKET).download(sheetPath);
    if (dlErr || !fileBlob) {
      failures.push({
        catalogId: id,
        name: catalog.name,
        error: dlErr?.message ?? "Download PDF dal catalogo fallito.",
      });
      continue;
    }

    const bytes = Buffer.from(await fileBlob.arrayBuffer());
    if (!bytes.length) {
      failures.push({ catalogId: id, name: catalog.name, error: "PDF catalogo vuoto." });
      continue;
    }

    const safePdfName = `${catalog.slug}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const newSheetPath = `${campaignId}/${randomUUID()}-${safePdfName}`;
    const { error: upErr } = await admin.storage.from(CHARACTER_SHEETS_BUCKET).upload(newSheetPath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upErr) {
      failures.push({ catalogId: id, name: catalog.name, error: upErr.message ?? "Upload PDF in campagna fallito." });
      continue;
    }

    let rules_snapshot: Json;
    try {
      rules_snapshot = (await recomputeCharacterRulesSnapshot({
        campaignId,
        level: 1,
        characterClass: catalog.character_class,
        classSubclass: catalog.class_subclass,
        raceSlug: catalog.race_slug,
        subclassSlug: catalog.subclass_slug,
        backgroundSlug: catalog.background_slug,
      })) as unknown as Json;
    } catch (snapErr) {
      await admin.storage.from(CHARACTER_SHEETS_BUCKET).remove([newSheetPath]);
      failures.push({
        catalogId: id,
        name: catalog.name,
        error: snapErr instanceof Error ? snapErr.message : "Errore snapshot regole.",
      });
      continue;
    }

    const { data: row, error: insErr } = await ctx.supabase
      .from("campaign_characters")
      .insert({
        campaign_id: campaignId,
        name: catalog.name,
        image_url: catalog.image_url,
        character_class: catalog.character_class,
        class_subclass: catalog.class_subclass,
        armor_class: catalog.armor_class,
        hit_points: catalog.hit_points,
        sheet_file_path: newSheetPath,
        background: catalog.background,
        race_slug: catalog.race_slug,
        subclass_slug: catalog.subclass_slug,
        background_slug: catalog.background_slug,
        rules_snapshot,
        assigned_to: null,
      })
      .select("id")
      .single();

    if (insErr || !row) {
      await admin.storage.from(CHARACTER_SHEETS_BUCKET).remove([newSheetPath]);
      failures.push({
        catalogId: id,
        name: catalog.name,
        error: insErr?.message ?? "Errore creazione personaggio in campagna.",
      });
      continue;
    }

    try {
      await syncCharacterBackgroundToCampaignMemory(admin, row.id, { campaignId });
    } catch (memoryErr) {
      console.error("[importCatalogEntriesToCampaign] campaign memory sync", memoryErr);
    }

    imported += 1;
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, imported, failures };
}
