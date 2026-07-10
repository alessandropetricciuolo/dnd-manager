import { PassThrough } from "stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createZipArchiver } from "@/lib/zip/create-zip-archiver";
import { fetchImageForExport, downloadStorageObject } from "@/lib/media-export/fetch-image";
import type { ImageExportRecord } from "@/lib/media-export/types";
import { getWikiContentBody } from "@/lib/wiki/content";
import { WIKI_ENTITY_LABELS_IT, type WikiEntityType } from "@/lib/wiki/entity-types";

const PAGE_SIZE = 500;

type WikiExportRow = {
  id: string;
  name: string;
  type: string;
  content: unknown;
  image_url: string | null;
  telegram_fallback_id: string | null;
  visibility: string | null;
  is_secret: boolean;
  attributes: Record<string, unknown> | null;
  tags: string[] | null;
  sort_order: number | null;
  is_core: boolean | null;
  global_status: string | null;
  xp_value: number | null;
  linked_mission_id: string | null;
  include_in_campaign_ai_memory: boolean | null;
  created_at: string;
  updated_at: string;
};

type RelationshipRow = {
  id: string;
  source_id: string;
  target_id: string | null;
  target_map_id: string | null;
  label: string;
};

export type WikiArchiveManifestEntity = {
  id: string;
  title: string;
  category: string;
  content: string;
  is_secret: boolean;
  visibility: string;
  attributes: Record<string, unknown>;
  tags: string[];
  sort_order: number | null;
  is_core: boolean | null;
  global_status: string | null;
  xp_value: number | null;
  linked_mission_id: string | null;
  include_in_campaign_ai_memory: boolean | null;
  markdownFile: string;
  imageFile: string | null;
  hp?: string;
  ac?: string;
  gs?: string;
  exp?: number;
};

export type WikiArchiveManifest = {
  version: 1;
  campaignId: string;
  campaignName: string;
  exportedAt: string;
  entityCount: number;
  imageCount: number;
  entities: WikiArchiveManifestEntity[];
  relationships: RelationshipRow[];
};

type BuildZipResult = {
  stream: PassThrough;
  filename: string;
};

function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60) || "voce"
  );
}

function uniqueZipPath(folder: string, base: string, ext: string, used: Set<string>): string {
  let candidate = `${folder}/${base}.${ext}`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${folder}/${base}_${n}.${ext}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

async function fetchWikiEntities(
  admin: SupabaseClient<Database>,
  campaignId: string
): Promise<WikiExportRow[]> {
  const rows: WikiExportRow[] = [];
  let from = 0;
  const select =
    "id, name, type, content, image_url, telegram_fallback_id, visibility, is_secret, attributes, tags, sort_order, is_core, global_status, xp_value, linked_mission_id, include_in_campaign_ai_memory, created_at, updated_at";

  while (true) {
    const { data, error } = await admin
      .from("wiki_entities")
      .select(select)
      .eq("campaign_id", campaignId)
      .order("type", { ascending: true })
      .order("name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as WikiExportRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchRelationships(
  admin: SupabaseClient<Database>,
  campaignId: string
): Promise<RelationshipRow[]> {
  const { data, error } = await admin
    .from("wiki_relationships")
    .select("id, source_id, target_id, target_map_id, label")
    .eq("campaign_id", campaignId);
  if (error) {
    if (error.message?.includes("wiki_relationships")) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as RelationshipRow[];
}

function formatEntityMarkdown(row: WikiExportRow, body: string): string {
  const typeLabel =
    WIKI_ENTITY_LABELS_IT[row.type as WikiEntityType] ?? row.type;
  const attrs = row.attributes ?? {};
  const gmNotes = typeof attrs.gm_notes === "string" ? attrs.gm_notes.trim() : "";
  const attrsForExport = { ...attrs };
  delete attrsForExport.gm_notes;

  const lines: string[] = [
    "---",
    `id: ${row.id}`,
    `type: ${row.type}`,
    `type_label: ${typeLabel}`,
    `visibility: ${row.visibility ?? (row.is_secret ? "secret" : "public")}`,
    `is_secret: ${row.is_secret}`,
  ];
  if (row.tags?.length) lines.push(`tags: ${row.tags.join(", ")}`);
  if (row.sort_order != null) lines.push(`sort_order: ${row.sort_order}`);
  if (row.is_core) lines.push("is_core: true");
  if (row.global_status) lines.push(`global_status: ${row.global_status}`);
  if (row.xp_value != null) lines.push(`xp_value: ${row.xp_value}`);
  if (row.linked_mission_id) lines.push(`linked_mission_id: ${row.linked_mission_id}`);
  lines.push("---", "", `# ${row.name}`, "");
  if (body) lines.push(body, "");
  if (gmNotes) {
    lines.push("## Note GM", "", gmNotes, "");
  }
  const attrKeys = Object.keys(attrsForExport).filter(
    (k) => attrsForExport[k] != null && attrsForExport[k] !== ""
  );
  if (attrKeys.length > 0) {
    lines.push("## Attributi", "", "```json", JSON.stringify(attrsForExport, null, 2), "```", "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function manifestEntityFromRow(
  row: WikiExportRow,
  body: string,
  markdownFile: string,
  imageFile: string | null
): WikiArchiveManifestEntity {
  const attrs = row.attributes ?? {};
  const combat = (attrs.combat_stats ?? {}) as Record<string, unknown>;
  const entry: WikiArchiveManifestEntity = {
    id: row.id,
    title: row.name,
    category: row.type,
    content: body,
    is_secret: row.is_secret,
    visibility: row.visibility ?? (row.is_secret ? "secret" : "public"),
    attributes: attrs,
    tags: row.tags ?? [],
    sort_order: row.sort_order,
    is_core: row.is_core ?? null,
    global_status: row.global_status ?? null,
    xp_value: row.xp_value ?? null,
    linked_mission_id: row.linked_mission_id ?? null,
    include_in_campaign_ai_memory: row.include_in_campaign_ai_memory ?? null,
    markdownFile,
    imageFile,
  };
  if (row.type === "monster" || row.type === "npc") {
    if (combat.hp != null && String(combat.hp).trim()) entry.hp = String(combat.hp);
    if (combat.ac != null && String(combat.ac).trim()) entry.ac = String(combat.ac);
    if (combat.cr != null && String(combat.cr).trim()) entry.gs = String(combat.cr);
    if (row.xp_value != null) entry.exp = row.xp_value;
  }
  return entry;
}

function campaignsStoragePath(imageUrl: string | null): string | null {
  if (!imageUrl?.trim()) return null;
  const raw = imageUrl.trim();
  const marker = "/storage/v1/object/public/campaigns/";
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(raw.slice(idx + marker.length)).replace(/^\/+/, "") || null;
}

async function fetchWikiEntityImage(
  admin: SupabaseClient<Database>,
  row: WikiExportRow,
  siteOrigin: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  const storagePath = campaignsStoragePath(row.image_url);
  if (storagePath) {
    const fromStorage = await downloadStorageObject(admin, "campaigns", storagePath);
    if (fromStorage) return fromStorage;
  }
  const record: ImageExportRecord = {
    source: "wiki",
    id: row.id,
    label: slugify(row.name),
    imageUrl: row.image_url,
    telegramFallbackId: row.telegram_fallback_id,
  };
  return fetchImageForExport(record, siteOrigin);
}

export async function buildCampaignWikiArchiveZip(
  admin: SupabaseClient<Database>,
  campaignId: string,
  options: { campaignName?: string; siteOrigin: string }
): Promise<BuildZipResult> {
  const entities = await fetchWikiEntities(admin, campaignId);
  if (entities.length === 0) {
    throw new Error("Nessuna voce wiki in questa campagna.");
  }

  const relationships = await fetchRelationships(admin, campaignId);
  const stamp = new Date().toISOString().slice(0, 10);
  const label =
    options.campaignName?.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40) || "campagna";
  const filename = `barber-and-dragons-wiki_${label}_${stamp}.zip`;

  const passThrough = new PassThrough();
  const archive = createZipArchiver({ zlib: { level: 6 } });
  archive.pipe(passThrough);

  const usedPaths = new Set<string>();
  const manifestEntities: WikiArchiveManifestEntity[] = [];
  let imageCount = 0;
  const imageFailures: string[] = [];

  for (const row of entities) {
    const body = getWikiContentBody(row.content);
    const baseName = `${slugify(row.name)}_${row.id.slice(0, 8)}`;
    const mdPath = uniqueZipPath(`testi/${row.type}`, baseName, "md", usedPaths);
    archive.append(formatEntityMarkdown(row, body), { name: mdPath });

    let imagePath: string | null = null;
    if (row.image_url?.trim() || row.telegram_fallback_id?.trim()) {
      const fetched = await fetchWikiEntityImage(admin, row, options.siteOrigin);
      if (fetched) {
        imagePath = uniqueZipPath(`immagini/${row.type}`, baseName, fetched.ext, usedPaths);
        archive.append(fetched.buffer, { name: imagePath });
        imageCount += 1;
      } else {
        imageFailures.push(row.name);
      }
    }

    manifestEntities.push(manifestEntityFromRow(row, body, mdPath, imagePath));
  }

  const manifest: WikiArchiveManifest = {
    version: 1,
    campaignId,
    campaignName: options.campaignName ?? campaignId,
    exportedAt: new Date().toISOString(),
    entityCount: entities.length,
    imageCount,
    entities: manifestEntities,
    relationships,
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  archive.append(
    [
      "Archivio wiki — Barber And Dragons",
      `Data: ${manifest.exportedAt}`,
      `Campagna: ${options.campaignName ?? campaignId}`,
      `Voci wiki: ${entities.length}`,
      `Immagini incluse: ${imageCount}`,
      `Collegamenti (wiki_relationships): ${relationships.length}`,
      "",
      "Contenuto del pacchetto:",
      "- manifest.json — dati strutturati (compatibile con import bulk)",
      "- testi/<tipo>/*.md — schede in Markdown con note GM e attributi",
      "- immagini/<tipo>/* — immagini delle voci wiki",
      "",
      imageFailures.length > 0
        ? `Immagini non scaricabili (${imageFailures.length}):\n${imageFailures.map((n) => `- ${n}`).join("\n")}`
        : "",
      "",
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
    { name: "LEGGIMI.txt" }
  );

  void archive.finalize();
  return { stream: passThrough, filename };
}
