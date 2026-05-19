import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { CollectImagesOptions, ImageExportRecord } from "./types";

const PAGE_SIZE = 500;

function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "senza_nome"
  );
}

function pushRow(
  out: ImageExportRecord[],
  seen: Set<string>,
  row: Omit<ImageExportRecord, "label"> & { label?: string; name?: string | null }
) {
  const url = row.imageUrl?.trim() || null;
  const fallback = row.telegramFallbackId?.trim() || null;
  if (!url && !fallback) return;

  const key = `${row.source}:${row.id}:${url ?? ""}:${fallback ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);

  const label = slugify(row.label ?? row.name ?? `${row.source}_${row.id.slice(0, 8)}`);
  out.push({
    source: row.source,
    id: row.id,
    label,
    imageUrl: url,
    telegramFallbackId: fallback,
  });
}

async function fetchAllRows<T extends Record<string, unknown>>(
  admin: SupabaseClient<Database>,
  table: string,
  select: string,
  applyFilter?: (q: ReturnType<SupabaseClient<Database>["from"]>) => ReturnType<SupabaseClient<Database>["from"]>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    let query = admin.from(table as keyof Database["public"]["Tables"]).select(select);
    if (applyFilter) {
      query = applyFilter(query) as typeof query;
    }
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[collect-images] ${table}`, error.message);
      break;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function collectSiteImages(
  admin: SupabaseClient<Database>,
  options: CollectImagesOptions = {}
): Promise<ImageExportRecord[]> {
  const { campaignId } = options;
  const out: ImageExportRecord[] = [];
  const seen = new Set<string>();

  const campaignFilter = campaignId
    ? (q: ReturnType<SupabaseClient<Database>["from"]>) => q.eq("campaign_id", campaignId)
    : undefined;

  const campaigns = await fetchAllRows<{
    id: string;
    name: string | null;
    image_url: string | null;
    telegram_fallback_id: string | null;
  }>(admin, "campaigns", "id, name, image_url, telegram_fallback_id", campaignId ? (q) => q.eq("id", campaignId) : undefined);

  for (const row of campaigns) {
    pushRow(out, seen, {
      source: "campaigns",
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      telegramFallbackId: row.telegram_fallback_id,
    });
  }

  const tableSpecs: Array<{
    table: string;
    select: string;
    source: string;
    getName: (row: Record<string, unknown>) => string | null;
  }> = [
    {
      table: "campaign_characters",
      select: "id, name, image_url, telegram_fallback_id, campaign_id",
      source: "personaggi",
      getName: (r) => (r.name as string) ?? null,
    },
    {
      table: "wiki_entities",
      select: "id, name, image_url, telegram_fallback_id, campaign_id",
      source: "wiki",
      getName: (r) => (r.name as string) ?? null,
    },
    {
      table: "maps",
      select: "id, name, image_url, telegram_fallback_id, campaign_id",
      source: "mappe",
      getName: (r) => (r.name as string) ?? null,
    },
    {
      table: "gm_notes",
      select: "id, title, image_url, telegram_fallback_id, campaign_id",
      source: "gm_notes",
      getName: (r) => (r.title as string) ?? null,
    },
    {
      table: "secret_whispers",
      select: "id, image_url, campaign_id",
      source: "sussurri",
      getName: () => "sussurro",
    },
  ];

  for (const spec of tableSpecs) {
    const rows = await fetchAllRows<Record<string, unknown>>(
      admin,
      spec.table,
      spec.select,
      campaignFilter
    );
    for (const row of rows) {
      pushRow(out, seen, {
        source: spec.source,
        id: row.id as string,
        name: spec.getName(row),
        imageUrl: (row.image_url as string | null) ?? null,
        telegramFallbackId: (row.telegram_fallback_id as string | null) ?? null,
      });
    }
  }

  const explorationRows = await fetchAllRows<{
    id: string;
    name: string | null;
    image_path: string | null;
    campaign_id: string;
  }>(
    admin,
    "campaign_exploration_maps",
    "id, name, image_path, campaign_id",
    campaignFilter
  );
  for (const row of explorationRows) {
    const path = row.image_path?.trim();
    if (!path) continue;
    const publicUrl = getExplorationMapPublicUrl(path);
    const tgMatch = publicUrl.match(/\/api\/tg-image\/([^/?#]+)/);
    pushRow(out, seen, {
      source: "mappe_esplorazione",
      id: row.id,
      name: row.name,
      imageUrl: publicUrl.startsWith("http") ? publicUrl : publicUrl.startsWith("/") ? publicUrl : null,
      telegramFallbackId: tgMatch ? decodeURIComponent(tgMatch[1]) : null,
    });
  }

  if (!campaignId) {
    const avatars = await fetchAllRows<{
      id: string;
      name: string | null;
      image_url: string | null;
      telegram_fallback_id: string | null;
    }>(admin, "avatars", "id, name, image_url, telegram_fallback_id");
    for (const row of avatars) {
      pushRow(out, seen, {
        source: "avatars_galleria",
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        telegramFallbackId: row.telegram_fallback_id,
      });
    }

    const catalog = await fetchAllRows<{
      id: string;
      name: string | null;
      image_url: string | null;
    }>(admin, "character_catalog", "id, name, image_url");
    for (const row of catalog) {
      pushRow(out, seen, {
        source: "catalogo_pg",
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        telegramFallbackId: null,
      });
    }

    const profiles = await fetchAllRows<{
      id: string;
      display_name: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      portrait_url: string | null;
    }>(admin, "profiles", "id, display_name, first_name, last_name, avatar_url, portrait_url");
    for (const row of profiles) {
      const name =
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
        row.display_name ||
        row.id.slice(0, 8);
      if (row.avatar_url?.trim()) {
        pushRow(out, seen, {
          source: "profili",
          id: `${row.id}_avatar`,
          name: `${name}_avatar`,
          imageUrl: row.avatar_url,
          telegramFallbackId: null,
        });
      }
      if (row.portrait_url?.trim()) {
        pushRow(out, seen, {
          source: "profili",
          id: `${row.id}_portrait`,
          name: `${name}_ritratto`,
          imageUrl: row.portrait_url,
          telegramFallbackId: null,
        });
      }
    }
  }

  try {
    type GmAttachmentRow = {
      id: string;
      file_name: string | null;
      file_path: string | null;
      mime_type: string | null;
      campaign_id: string | null;
    };
    const { data: attachmentsRaw } = await admin
      .from("gm_attachments" as "campaigns")
      .select("id, file_name, file_path, mime_type, campaign_id")
      .like("mime_type", "image/%")
      .limit(2000);
    const attachments = (attachmentsRaw ?? []) as unknown as GmAttachmentRow[];

    for (const row of attachments) {
      if (campaignId && row.campaign_id !== campaignId) continue;
      const path = row.file_path?.trim();
      if (!path) continue;
      pushRow(out, seen, {
        source: "gm_allegati",
        id: row.id,
        name: row.file_name ?? "allegato",
        imageUrl: path,
        telegramFallbackId: null,
      });
    }
  } catch (e) {
    console.error("[collect-images] gm_attachments", e);
  }

  return out;
}
