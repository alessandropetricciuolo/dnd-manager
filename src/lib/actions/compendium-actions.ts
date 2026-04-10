'use server';

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { ALL_CAMPAIGNS_KEY } from "@/lib/compendium/constants";
import { getWikiContentBody } from "@/lib/wiki/content";
import { type WikiEntityType, WIKI_ENTITY_LABELS_IT } from "@/lib/wiki/entity-types";

export type CompendiumCampaign = {
  id: string;
  name: string;
};

export type CompendiumElement = {
  id: string;
  name: string;
  type: (typeof WIKI_ENTITY_LABELS_IT)[WikiEntityType];
  tags: string[];
  shortDesc: string;
  content: string;
  searchText: string;
  imageUrl: string;
  details: Record<string, string>;
};

export type CompendiumPayload = {
  campaigns: CompendiumCampaign[];
  selectedCampaignId: string | null;
  elements: CompendiumElement[];
};

export type CompendiumResult =
  | { success: true; data: CompendiumPayload }
  | { success: false; error: string };

function mapType(raw: string): CompendiumElement["type"] {
  if (raw in WIKI_ENTITY_LABELS_IT) {
    const key = raw as WikiEntityType;
    return WIKI_ENTITY_LABELS_IT[key];
  }
  return "Lore";
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const idx = cleaned.search(/[.!?]\s/);
  if (idx < 0) return cleaned.slice(0, 180);
  return cleaned.slice(0, Math.min(idx + 1, 180)).trim();
}

function flattenAttributes(
  value: unknown,
  out: Record<string, string>,
  parentKey?: string
): void {
  if (value == null) return;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const key = parentKey?.trim();
    if (key) out[key] = String(value);
    return;
  }

  if (Array.isArray(value)) {
    const key = parentKey?.trim();
    if (key) out[key] = value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ");
    return;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const normalized = k.replace(/_/g, " ").trim();
      // For known nested buckets like "combat stats", prefer child keys as standalone fields.
      const nextKey =
        !parentKey || parentKey.toLowerCase() === "combat stats" || parentKey.toLowerCase() === "combat_stats"
          ? normalized
          : `${parentKey} · ${normalized}`;
      flattenAttributes(v, out, nextKey);
    }
  }
}

export async function getCompendiumDataAction(
  selectedCampaignId?: string | null
): Promise<CompendiumResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "";
    const isAdmin = role === "admin";
    const isGm = role === "gm";
    if (!isAdmin && !isGm) {
      return { success: false, error: "Solo GM e Admin possono usare il Compendio." };
    }

    const { data: campaignsRows, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, name")
      .order("name", { ascending: true });
    if (campaignsError) return { success: false, error: campaignsError.message };

    const campaigns = (campaignsRows ?? []) as CompendiumCampaign[];
    const fallbackCampaignId = campaigns.length > 0 ? ALL_CAMPAIGNS_KEY : null;
    const campaignId = selectedCampaignId === ALL_CAMPAIGNS_KEY
      ? ALL_CAMPAIGNS_KEY
      : selectedCampaignId && campaigns.some((c) => c.id === selectedCampaignId)
        ? selectedCampaignId
        : fallbackCampaignId;

    if (!campaignId) {
      return {
        success: true,
        data: { campaigns, selectedCampaignId: null, elements: [] },
      };
    }

    const campaignById = campaigns.reduce<Record<string, string>>((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
    const campaignIds = campaignId === ALL_CAMPAIGNS_KEY ? campaigns.map((c) => c.id) : [campaignId];

    const baseQuery = supabase
      .from("wiki_entities")
      .select("id, campaign_id, name, type, tags, content, image_url, attributes")
      .order("name", { ascending: true });

    const { data: wikiRows, error: wikiError } = campaignId === ALL_CAMPAIGNS_KEY
      ? await baseQuery.in("campaign_id", campaignIds)
      : await baseQuery.eq("campaign_id", campaignId);

    if (wikiError) return { success: false, error: wikiError.message };

    const elements: CompendiumElement[] = (wikiRows ?? []).map((row: Record<string, unknown>) => {
      const rawContent = getWikiContentBody(row.content);
      const campaignName = campaignById[String(row.campaign_id ?? "")] ?? "Campagna";
      const details: Record<string, string> = {};
      if (row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)) {
        flattenAttributes(row.attributes, details);
      }
      if (!details.Campagna) details.Campagna = campaignName;

      const tags = Array.isArray(row.tags)
        ? row.tags.filter((t): t is string => typeof t === "string")
        : [];
      if (!tags.includes(campaignName)) tags.push(campaignName);

      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? "Elemento senza nome"),
        type: mapType(String(row.type ?? "")),
        tags,
        shortDesc: firstSentence(rawContent) || "Nessuna descrizione breve disponibile.",
        content: rawContent || "Nessun contenuto disponibile.",
        searchText: [String(row.name ?? ""), firstSentence(rawContent), rawContent, tags.join(" ")]
          .join(" ")
          .toLowerCase(),
        imageUrl:
          typeof row.image_url === "string" && row.image_url.trim()
            ? row.image_url
            : "https://placehold.co/900x580/2a1f1d/e8dccb?text=Wiki",
        details,
      };
    });

    return {
      success: true,
      data: {
        campaigns,
        selectedCampaignId: campaignId,
        elements,
      },
    };
  } catch (err) {
    console.error("[getCompendiumDataAction]", err);
    return { success: false, error: "Errore nel caricamento del Compendio." };
  }
}
