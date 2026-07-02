import {
  formatSessionDraftForChat,
  generateSessionDraftFromPrompt,
  refineSessionDraftFromPrompt,
  sessionHintsFromInput,
  buildSessionDraftFromHintsOnly,
  type SessionAiDraft,
} from "@/lib/ai/session-text-generator";
import { normalizeEntityNameKey } from "@/lib/wiki/entity-reference-parser";
import { previewAction } from "../actions";
import { detectSessionCreateRequest } from "./session-request-detector";
import type { ChatSessionMeta } from "./draft-assistant.types";
import type { PreviewedProposal } from "./preview-proposals";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

function findPartyByName(
  name: string,
  parties: { id: string; name: string }[]
): { id: string; name: string } | null {
  const key = normalizeEntityNameKey(name);
  if (!key) return null;

  const exact = parties.filter((p) => normalizeEntityNameKey(p.name) === key);
  if (exact.length === 1) return exact[0]!;

  const partial = parties.filter((p) => {
    const n = normalizeEntityNameKey(p.name);
    return n.includes(key) || key.includes(n);
  });
  if (partial.length === 1) return partial[0]!;

  return null;
}

async function loadCampaignParties(
  campaignId: string
): Promise<{ id: string; name: string }[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("campaign_parties")
    .select("id, name")
    .eq("campaign_id", campaignId)
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}

async function loadCampaignIsLong(campaignId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("campaigns").select("type").eq("id", campaignId).maybeSingle();
  return (data as { type?: string } | null)?.type === "long";
}

export function buildSessionCreateInput(
  campaignId: string,
  draft: SessionAiDraft,
  resolved: { partyId: string | null; partyLabel: string | null }
): Record<string, unknown> {
  return {
    campaignId,
    date: draft.date,
    time: draft.time,
    location: draft.location,
    maxPlayers: draft.maxPlayers,
    chapterTitle: draft.chapterTitle,
    partyId: resolved.partyId,
    partyName: resolved.partyLabel ?? draft.partyName,
  };
}

function formatSessionPreviewPayload(
  draft: SessionAiDraft,
  partyLabel: string | null
): Record<string, unknown> {
  const markdown = formatSessionDraftForChat(draft, partyLabel);
  return {
    date: draft.date,
    time: draft.time,
    scheduledAt: `${draft.date} ${draft.time}`,
    chapterTitle: draft.chapterTitle,
    location: draft.location,
    maxPlayers: draft.maxPlayers,
    partyName: partyLabel ?? draft.partyName,
    contentMarkdown: markdown,
    assistantPreview: markdown,
  };
}

export async function enrichSessionProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    sessionMeta?: ChatSessionMeta | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      sessionMeta: ChatSessionMeta;
      assistantMessage: string;
    }
  | { ok: false; error: string }
> {
  const inputHints = sessionHintsFromInput(proposal.input);
  const detected = detectSessionCreateRequest(
    options?.sessionMeta?.userPrompt?.trim() || userMessage.trim()
  );
  const mergedHints = {
    ...inputHints,
    ...(detected?.date ? { date: detected.date } : {}),
    ...(detected?.time ? { time: detected.time } : {}),
    ...(detected?.chapterTitle ? { chapterTitle: detected.chapterTitle } : {}),
    ...(detected?.location ? { location: detected.location } : {}),
    ...(detected?.partyName ? { partyName: detected.partyName } : {}),
    ...(detected?.maxPlayers != null ? { maxPlayers: detected.maxPlayers } : {}),
  };

  const userPrompt = options?.sessionMeta?.userPrompt?.trim() || userMessage.trim();
  if (!userPrompt) {
    return { ok: false, error: "Descrivi la sessione da programmare (data, ora, capitolo…)." };
  }

  const chatMessages = options?.refine
    ? [...(options.sessionMeta?.chatMessages ?? []), { role: "user" as const, content: userMessage.trim() }]
    : [{ role: "user" as const, content: userMessage.trim() }];

  const generated =
    options?.refine && options.sessionMeta?.draft
      ? await refineSessionDraftFromPrompt(campaignId, userMessage.trim(), options.sessionMeta.draft)
      : await generateSessionDraftFromPrompt(campaignId, userPrompt, mergedHints);

  let draft: SessionAiDraft;
  let assistantMessage: string;

  if (generated.ok) {
    draft = generated.draft;
    assistantMessage = generated.assistantMessage;
  } else {
    const fromHints = buildSessionDraftFromHintsOnly(mergedHints);
    if (!fromHints) {
      return {
        ok: false,
        error:
          generated.error ??
          "Indica almeno la data della sessione (es. «sabato 15 marzo ore 21»).",
      };
    }
    draft = fromHints;
    assistantMessage = formatSessionDraftForChat(draft, mergedHints.partyName ?? null);
  }

  const isLongCampaign = await loadCampaignIsLong(campaignId);
  let partyId: string | null = null;
  let partyLabel: string | null = null;

  if (isLongCampaign && draft.partyName) {
    const parties = await loadCampaignParties(campaignId);
    const match = findPartyByName(draft.partyName, parties);
    if (match) {
      partyId = match.id;
      partyLabel = match.name;
    } else if (parties.length === 1) {
      partyId = parties[0]!.id;
      partyLabel = parties[0]!.name;
    } else if (parties.length > 1) {
      const names = parties.map((p) => p.name).join(", ");
      return {
        ok: false,
        error: `Non trovo il party «${draft.partyName}». Gruppi disponibili: ${names}.`,
      };
    }
  }

  if (isLongCampaign && !draft.chapterTitle && !options?.refine) {
    draft = { ...draft, chapterTitle: null };
  }

  const input = buildSessionCreateInput(campaignId, draft, { partyId, partyLabel });
  const previewResult = await previewAction("session.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? {
        ...formatSessionPreviewPayload(draft, partyLabel),
        ...(previewResult.data as Record<string, unknown>),
      }
    : { error: previewResult.error, ...formatSessionPreviewPayload(draft, partyLabel) };

  const sessionMeta: ChatSessionMeta = {
    userPrompt,
    draft,
    partyId,
    partyLabel,
    isLongCampaign,
    chatMessages: [...chatMessages, { role: "assistant", content: assistantMessage }],
  };

  return {
    ok: true,
    proposal: {
      action_name: "session.create",
      input,
      rationale: proposal.rationale,
      preview_payload,
    },
    sessionMeta,
    assistantMessage: [
      assistantMessage,
      "",
      "_Conferma per creare la sessione in calendario._",
    ].join("\n"),
  };
}
