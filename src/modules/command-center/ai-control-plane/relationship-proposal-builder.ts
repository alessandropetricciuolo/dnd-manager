import {
  findCatalogEntryByName,
  normalizeEntityNameKey,
  type WikiCatalogEntry,
} from "@/lib/wiki/entity-reference-parser";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { previewAction } from "../actions";
import type { ChatRelationshipMeta } from "./draft-assistant.types";
import type { PreviewedProposal } from "./preview-proposals";
import {
  detectRelationshipCreateRequest,
  refineRelationshipRequest,
  type DetectedRelationshipRequest,
} from "./relationship-request-detector";

export function formatRelationshipForChat(
  sourceName: string,
  label: string,
  targetName: string,
  targetKind?: "wiki" | "map"
): string {
  const targetSuffix = targetKind === "map" ? " (mappa)" : "";
  return [`**${sourceName}** —[${label}]→ **${targetName}**${targetSuffix}`].join("\n");
}

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

function suggestSimilarNames(name: string, catalog: WikiCatalogEntry[]): string[] {
  const key = normalizeEntityNameKey(name);
  if (!key) return [];
  return catalog
    .filter((e) => {
      const n = normalizeEntityNameKey(e.name);
      return n.includes(key.slice(0, Math.min(4, key.length))) || key.includes(n.slice(0, 4));
    })
    .slice(0, 5)
    .map((e) => e.name);
}

type ResolvedRelationship = {
  sourceId: string;
  sourceName: string;
  targetId: string | null;
  targetMapId: string | null;
  targetName: string;
  targetKind: "wiki" | "map";
  label: string;
};

function resolveRelationshipEntities(
  campaignId: string,
  request: DetectedRelationshipRequest,
  catalog: WikiCatalogEntry[]
): { ok: true; data: ResolvedRelationship } | { ok: false; error: string } {
  const source = findCatalogEntryByName(request.sourceName, catalog);
  if (!source) {
    const hints = suggestSimilarNames(request.sourceName, catalog);
    const hintText = hints.length ? ` Forse intendevi: ${hints.join(", ")}.` : "";
    return {
      ok: false,
      error: `Non trovo la voce wiki/mappa «${request.sourceName}» in questa campagna.${hintText}`,
    };
  }

  const target = findCatalogEntryByName(request.targetName, catalog, source.id);
  if (!target) {
    const hints = suggestSimilarNames(request.targetName, catalog);
    const hintText = hints.length ? ` Forse intendevi: ${hints.join(", ")}.` : "";
    return {
      ok: false,
      error: `Non trovo il bersaglio «${request.targetName}» in questa campagna.${hintText}`,
    };
  }

  if (source.id === target.id) {
    return { ok: false, error: "Sorgente e bersaglio devono essere entità diverse." };
  }

  return {
    ok: true,
    data: {
      sourceId: source.id,
      sourceName: source.name,
      targetId: target.kind === "wiki" ? target.id : null,
      targetMapId: target.kind === "map" ? target.id : null,
      targetName: target.name,
      targetKind: target.kind,
      label: request.label.trim() || "—",
    },
  };
}

function detectedFromProposalInput(
  proposal: PreviewedProposal,
  userMessage: string
): DetectedRelationshipRequest | null {
  const sourceName =
    typeof proposal.input.sourceName === "string" ? proposal.input.sourceName.trim() : "";
  const targetName =
    typeof proposal.input.targetName === "string" ? proposal.input.targetName.trim() : "";
  const label = typeof proposal.input.label === "string" ? proposal.input.label.trim() : "";
  if (!sourceName || !targetName || !label) return null;
  return {
    sourceName,
    targetName,
    label,
    userPrompt: userMessage.trim(),
  };
}

export async function enrichRelationshipProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    relationshipMeta?: ChatRelationshipMeta | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      relationshipMeta: ChatRelationshipMeta;
      assistantMessage: string;
    }
  | { ok: false; error: string }
> {
  const userPrompt = options?.relationshipMeta?.userPrompt?.trim() || userMessage.trim();
  if (!userPrompt) {
    return { ok: false, error: "Descrivi la relazione che vuoi creare (es. collega X a Y)." };
  }

  const request =
    options?.refine && options.relationshipMeta?.request
      ? refineRelationshipRequest(userMessage.trim(), options.relationshipMeta.request)
      : detectRelationshipCreateRequest(userPrompt) ??
        detectedFromProposalInput(proposal, userPrompt);

  if (!request) {
    return {
      ok: false,
      error:
        "Non ho capito sorgente e bersaglio. Prova: «collega Gambly alla Torre Nera come custode».",
    };
  }

  const catalog = await loadCampaignCatalog(campaignId);
  if (!catalog.length) {
    return {
      ok: false,
      error: "La campagna non ha ancora voci wiki o mappe da collegare.",
    };
  }

  const resolved = resolveRelationshipEntities(campaignId, request, catalog);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const { data } = resolved;
  const assistantMessage = formatRelationshipForChat(
    data.sourceName,
    data.label,
    data.targetName,
    data.targetKind
  );

  const relationshipMeta: ChatRelationshipMeta = {
    userPrompt,
    request,
    resolved: {
      sourceId: data.sourceId,
      sourceName: data.sourceName,
      targetId: data.targetId,
      targetMapId: data.targetMapId,
      targetName: data.targetName,
      targetKind: data.targetKind,
      label: data.label,
    },
    chatMessages: [
      ...(options?.relationshipMeta?.chatMessages ?? []),
      ...(options?.refine ? [{ role: "user" as const, content: userMessage.trim() }] : []),
      { role: "assistant", content: assistantMessage },
    ],
  };

  const input: Record<string, unknown> = {
    campaignId,
    sourceId: data.sourceId,
    targetId: data.targetId,
    targetMapId: data.targetMapId,
    label: data.label,
    sourceName: data.sourceName,
    targetName: data.targetName,
    targetKind: data.targetKind,
  };

  const previewResult = await previewAction("wiki.relationship.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? {
        ...buildRelationshipPreviewPayload(relationshipMeta),
        ...(previewResult.data as Record<string, unknown>),
      }
    : {
        error: previewResult.error,
        ...buildRelationshipPreviewPayload(relationshipMeta),
      };

  return {
    ok: true,
    proposal: {
      action_name: "wiki.relationship.create",
      input,
      rationale: proposal.rationale,
      preview_payload,
    },
    relationshipMeta,
    assistantMessage: [
      assistantMessage,
      "",
      "_Conferma per aggiungere il collegamento alla mappa concettuale._",
    ].join("\n"),
  };
}

export function buildRelationshipPreviewPayload(
  relationshipMeta: ChatRelationshipMeta
): Record<string, unknown> {
  const { resolved } = relationshipMeta;
  const graphPreview = formatRelationshipForChat(
    resolved.sourceName,
    resolved.label,
    resolved.targetName,
    resolved.targetKind
  );
  return {
    sourceName: resolved.sourceName,
    targetName: resolved.targetName,
    label: resolved.label,
    targetKind: resolved.targetKind,
    graphPreview,
    assistantPreview: graphPreview,
    contentMarkdown: graphPreview,
  };
}
