import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  findCatalogEntryByName,
  type WikiCatalogEntry,
} from "@/lib/wiki/entity-reference-parser";
import { extractWikiEntityMemoryText } from "@/lib/campaign-wiki-ai-memory";
import type { Json } from "@/types/database.types";
import type { WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";
import type { ChatPendingProposalPayload, ChatWikiBatchItem, ChatWikiBatchMeta } from "./draft-assistant.types";
import type { PreviewedProposal } from "./preview-proposals";
import {
  buildNpcRolePrompt,
  type DetectedNpcBatchRequest,
  formatNpcBatchIntro,
} from "./wiki-npc-batch";
import {
  activateBatchItem,
  applyWikiImageOfferPhaseForBatchItem,
} from "./wiki-npc-batch-pending";
import {
  enrichWikiEntityProposal,
  type WikiEntityRelationInput,
} from "./wiki-proposal-builder";
import { resolveWikiVisibilityForAssistant } from "./wiki-request-detector";

type LocationContext = {
  locationName: string | null;
  locationTargetId: string | null;
  locationTargetKind: "wiki" | "map" | null;
  locationExcerpt: string | null;
  relations: WikiEntityRelationInput[];
};

async function loadCampaignCatalog(campaignId: string): Promise<WikiCatalogEntry[]> {
  const admin = createSupabaseAdminClient();
  const [entitiesRes, mapsRes] = await Promise.all([
    admin.from("wiki_entities").select("id, name").eq("campaign_id", campaignId).order("name"),
    admin.from("maps").select("id, name").eq("campaign_id", campaignId).order("name"),
  ]);

  const catalog: WikiCatalogEntry[] = [];
  for (const row of (entitiesRes.data ?? []) as { id: string; name: string }[]) {
    if (row.id && row.name) catalog.push({ id: row.id, name: row.name, kind: "wiki" });
  }
  for (const row of (mapsRes.data ?? []) as { id: string; name: string }[]) {
    if (row.id && row.name) catalog.push({ id: row.id, name: row.name, kind: "map" });
  }
  return catalog;
}

async function resolveBatchLocationContext(
  campaignId: string,
  locationName: string | null
): Promise<LocationContext> {
  if (!locationName?.trim()) {
    return {
      locationName: null,
      locationTargetId: null,
      locationTargetKind: null,
      locationExcerpt: null,
      relations: [],
    };
  }

  const catalog = await loadCampaignCatalog(campaignId);
  const entry = findCatalogEntryByName(locationName, catalog);
  if (!entry) {
    return {
      locationName,
      locationTargetId: null,
      locationTargetKind: null,
      locationExcerpt: null,
      relations: [],
    };
  }

  let locationExcerpt: string | null = null;
  if (entry.kind === "wiki") {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("wiki_entities")
      .select("content, attributes")
      .eq("id", entry.id)
      .maybeSingle();
    if (data) {
      locationExcerpt = extractWikiEntityMemoryText(
        (data as { content: Json }).content,
        (data as { attributes?: Json }).attributes ?? null
      );
    }
  }

  const relations: WikiEntityRelationInput[] = [
    {
      targetType: entry.kind,
      targetId: entry.id,
      label: "Vive e lavora a",
    },
  ];

  return {
    locationName: entry.name,
    locationTargetId: entry.id,
    locationTargetKind: entry.kind,
    locationExcerpt,
    relations,
  };
}

function stubBatchProposal(campaignId: string): PreviewedProposal {
  return {
    action_name: "wiki.entity.create",
    input: {
      campaignId,
      title: "Nuovo NPC",
      type: "npc",
      content: "",
      visibility: "secret",
    },
    rationale: "Batch NPC",
    preview_payload: {},
  };
}

export async function enrichNpcBatchProposals(
  campaignId: string,
  batch: DetectedNpcBatchRequest,
  sharedNpcBuildParams: WikiMarkdownExtraParams
): Promise<
  | { ok: true; pending: ChatPendingProposalPayload; assistantSummary: string }
  | { ok: false; error: string }
> {
  const location = await resolveBatchLocationContext(campaignId, batch.locationName);
  const visibility = resolveWikiVisibilityForAssistant(batch.userPrompt, batch.userPrompt);

  const enrichedItems = await Promise.all(
    batch.roles.map(async (roleLabel) => {
      const rolePrompt = buildNpcRolePrompt(
        roleLabel,
        location.locationName,
        location.locationExcerpt,
        batch.userPrompt
      );

      const enriched = await enrichWikiEntityProposal(
        campaignId,
        rolePrompt,
        "npc",
        roleLabel,
        {
          extraParams: sharedNpcBuildParams,
          userPromptOverride: rolePrompt,
          relations: location.relations,
          visibilityOverride: visibility,
        }
      );

      if (!enriched.ok) {
        throw new Error(enriched.error);
      }

      const item: ChatWikiBatchItem = {
        roleLabel,
        status: "ready",
        entityTitle:
          typeof enriched.proposal.input.title === "string"
            ? enriched.proposal.input.title
            : roleLabel,
        wikiMeta: enriched.wikiMeta,
        input: enriched.proposal.input,
        preview_payload: enriched.proposal.preview_payload,
        phase: "text",
      };

      return item;
    })
  );

  const wikiBatchMeta: ChatWikiBatchMeta = {
    originalPrompt: batch.userPrompt,
    roles: batch.roles,
    locationName: location.locationName,
    locationTargetId: location.locationTargetId,
    locationTargetKind: location.locationTargetKind,
    locationExcerpt: location.locationExcerpt,
    items: enrichedItems,
    activeIndex: 0,
    sharedNpcBuildParams,
    visibility,
  };

  let pending: ChatPendingProposalPayload = {
    ...stubBatchProposal(campaignId),
    wikiBatchMeta,
    rationale: "Batch NPC per luogo",
  };

  pending = activateBatchItem(pending, 0);
  pending = applyWikiImageOfferPhaseForBatchItem(pending);

  const locHint = location.locationName
    ? location.locationTargetId
      ? ` collegati a **${location.locationName}**`
      : ` ambientati a **${location.locationName}** (luogo non trovato nel catalogo: nessun collegamento automatico)`
    : "";

  const assistantSummary = [
    `Ho generato **${batch.roles.length} NPC**${locHint}: ${batch.roles.map((r) => `**${r}**`).join(", ")}.`,
    formatNpcBatchIntro(batch.roles, location.locationName, 0),
    pending.phase === "awaiting_image"
      ? "Vuoi generare l'immagine per il primo PNG? Scrivi **sì** o **no**."
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { ok: true, pending, assistantSummary };
}

export function buildAwaitingNpcBatchMechanicsPending(
  campaignId: string,
  batch: DetectedNpcBatchRequest,
  partialParams: WikiMarkdownExtraParams
): ChatPendingProposalPayload {
  const wikiBatchMeta: ChatWikiBatchMeta = {
    originalPrompt: batch.userPrompt,
    roles: batch.roles,
    locationName: batch.locationName,
    locationTargetId: null,
    locationTargetKind: null,
    locationExcerpt: null,
    items: batch.roles.map((roleLabel) => ({
      roleLabel,
      status: "pending" as const,
      entityTitle: roleLabel,
      wikiMeta: {
        entityType: "npc",
        entityTitle: roleLabel,
        userPrompt: batch.userPrompt,
        markdownDraft: { description: "", statblock: "" },
        chatMessages: [],
        npcBuildParams: partialParams,
      },
      input: {
        campaignId,
        title: roleLabel,
        type: "npc",
        content: "",
        visibility: "secret",
      },
      preview_payload: {},
    })),
    activeIndex: 0,
    sharedNpcBuildParams: partialParams,
    visibility: resolveWikiVisibilityForAssistant(batch.userPrompt, batch.userPrompt),
  };

  return {
    ...stubBatchProposal(campaignId),
    phase: "awaiting_npc_mechanics",
    wikiBatchMeta,
    wikiMeta: wikiBatchMeta.items[0]?.wikiMeta,
    preview_payload: {},
  };
}
