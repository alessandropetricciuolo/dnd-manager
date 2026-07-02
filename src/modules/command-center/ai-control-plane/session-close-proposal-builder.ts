import {
  formatSessionCloseDraftForChat,
  generateSessionCloseDraftFromPrompt,
  loadSessionCloseCampaignContext,
  refineSessionCloseDraftFromPrompt,
  type SessionCloseAiDraft,
  type SessionCloseGenerationContext,
} from "@/lib/ai/session-close-text-generator";
import {
  getApprovedSignupsForSession,
  getUnlockableContent,
} from "@/app/campaigns/actions";
import { getLongCampaignEconomySnapshot } from "@/lib/actions/campaign-economy-actions";
import type { SessionEconomyPayload } from "@/lib/actions/campaign-economy-actions";
import { normalizeEntityNameKey } from "@/lib/wiki/entity-reference-parser";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { previewAction } from "../actions";
import {
  detectSessionCloseRequest,
  type DetectedSessionCloseRequest,
} from "./session-close-request-detector";
import type { SessionCloseMissingField } from "./session-close.types";
import type { ChatSessionCloseMeta } from "./session-close.types";
import type { SessionCloseResolvedDraft } from "./session-close.types";
import type { PreviewedProposal } from "./preview-proposals";

export type { SessionCloseMissingField, SessionCloseResolvedDraft } from "./session-close.types";

type ScheduledSessionRow = {
  id: string;
  title: string | null;
  chapter_title: string | null;
  scheduled_at: string | null;
  is_pre_closed: boolean | null;
};

type SignupRow = {
  player_id: string;
  player_name: string;
};

function findPlayerByName(
  name: string,
  players: SignupRow[]
): SignupRow | null {
  const key = normalizeEntityNameKey(name);
  if (!key) return null;

  const exact = players.filter((p) => normalizeEntityNameKey(p.player_name) === key);
  if (exact.length === 1) return exact[0]!;

  const partial = players.filter((p) => {
    const n = normalizeEntityNameKey(p.player_name);
    return n.includes(key) || key.includes(n);
  });
  if (partial.length === 1) return partial[0]!;

  return null;
}

function findByName<T extends { name: string }>(
  name: string,
  items: T[]
): T | null {
  const key = normalizeEntityNameKey(name);
  if (!key) return null;

  const exact = items.filter((i) => normalizeEntityNameKey(i.name) === key);
  if (exact.length === 1) return exact[0]!;

  const partial = items.filter((i) => {
    const n = normalizeEntityNameKey(i.name);
    return n.includes(key) || key.includes(n);
  });
  if (partial.length === 1) return partial[0]!;

  return null;
}

function sessionLabel(row: ScheduledSessionRow): string {
  const date = row.scheduled_at?.slice(0, 10) ?? "data da definire";
  const title = row.chapter_title?.trim() || row.title?.trim();
  return title ? `${date} — ${title}` : date;
}

async function loadScheduledSessions(campaignId: string): Promise<ScheduledSessionRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("sessions")
    .select("id, title, chapter_title, scheduled_at, is_pre_closed")
    .eq("campaign_id", campaignId)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: false });

  return (data ?? []) as ScheduledSessionRow[];
}

async function loadCampaignIsLong(campaignId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("campaigns").select("type").eq("id", campaignId).maybeSingle();
  return (data as { type?: string } | null)?.type === "long";
}

async function loadCoreEntities(campaignId: string): Promise<
  { id: string; name: string; type: string; globalStatus: "alive" | "dead" | "missing" }[]
> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("wiki_entities")
    .select("id, name, type, global_status")
    .eq("campaign_id", campaignId)
    .eq("is_core", true)
    .order("name");

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      name: string;
      type: string;
      global_status?: string | null;
    };
    const gs = r.global_status;
    const globalStatus: "alive" | "dead" | "missing" =
      gs === "dead" ? "dead" : gs === "missing" ? "missing" : "alive";
    return { id: r.id, name: r.name, type: r.type, globalStatus };
  });
}

function resolveSessionId(
  sessions: ScheduledSessionRow[],
  detected: DetectedSessionCloseRequest | null,
  refineSessionId?: string | null
): { sessionId: string | null; candidates: ScheduledSessionRow[]; ambiguous: boolean } {
  if (refineSessionId) {
    const found = sessions.find((s) => s.id === refineSessionId);
    if (found) return { sessionId: found.id, candidates: [found], ambiguous: false };
  }

  if (!sessions.length) {
    return { sessionId: null, candidates: [], ambiguous: false };
  }

  if (sessions.length === 1) {
    return { sessionId: sessions[0]!.id, candidates: sessions, ambiguous: false };
  }

  let filtered = [...sessions];
  const dateHint = detected?.sessionDateHint;

  if (dateHint === "latest") {
    return { sessionId: sessions[0]!.id, candidates: [sessions[0]!], ambiguous: false };
  }

  if (dateHint === "today" || dateHint === "yesterday") {
    const today = new Date();
    const target = new Date(today);
    if (dateHint === "yesterday") target.setDate(target.getDate() - 1);
    const targetIso = target.toISOString().slice(0, 10);
    filtered = sessions.filter((s) => s.scheduled_at?.slice(0, 10) === targetIso);
  } else if (dateHint && /^\d{4}-\d{2}-\d{2}$/.test(dateHint)) {
    filtered = sessions.filter((s) => s.scheduled_at?.slice(0, 10) === dateHint);
  }

  const titleHint = detected?.sessionTitleHint?.toLowerCase();
  if (titleHint) {
    const byTitle = filtered.filter((s) => {
      const t = (s.chapter_title ?? s.title ?? "").toLowerCase();
      return t.includes(titleHint) || titleHint.includes(t);
    });
    if (byTitle.length) filtered = byTitle;
  }

  if (filtered.length === 1) {
    return { sessionId: filtered[0]!.id, candidates: filtered, ambiguous: false };
  }

  return { sessionId: null, candidates: filtered.length ? filtered : sessions, ambiguous: true };
}

function buildDefaultAttendance(
  signups: SignupRow[],
  draftAttendance: SessionCloseAiDraft["attendance"]
): Record<string, "attended" | "absent"> {
  const out: Record<string, "attended" | "absent"> = {};
  for (const s of signups) {
    out[s.player_id] = "attended";
  }
  for (const row of draftAttendance) {
    const player = findPlayerByName(row.playerName, signups);
    if (player) out[player.player_id] = row.status;
  }
  return out;
}

async function resolveEconomy(
  campaignId: string,
  draft: SessionCloseAiDraft,
  signups: SignupRow[]
): Promise<
  | { economy?: SessionEconomyPayload; note: string | null; needsWizard: boolean }
  | { error: string }
> {
  if (!draft.economyMentioned) {
    return { economy: undefined, note: null, needsWizard: false };
  }

  const simple = draft.economySimple;
  if (!simple) {
    return { economy: undefined, note: null, needsWizard: true };
  }

  const snap = await getLongCampaignEconomySnapshot(campaignId);
  if (!snap.success) {
    return { economy: undefined, note: simple.notes, needsWizard: true };
  }

  const { missions, characters } = snap.data;
  const characterCoinDeltas: SessionEconomyPayload["characterCoinDeltas"] = [];

  for (const coin of simple.characterCoins) {
    const char =
      findByName(coin.characterName, characters) ??
      (() => {
        const player = findPlayerByName(coin.characterName, signups);
        if (!player) return null;
        const assigned = characters.filter((c) => c.assigned_to === player.player_id);
        return assigned.length === 1 ? assigned[0]! : null;
      })();

    if (!char) {
      if (simple.characterCoins.length === 1) {
        return { error: `Non trovo il personaggio «${coin.characterName}» per le monete.` };
      }
      continue;
    }

    const gp = coin.coins_gp ?? 0;
    const sp = coin.coins_sp ?? 0;
    const cp = coin.coins_cp ?? 0;
    if (gp !== 0 || sp !== 0 || cp !== 0) {
      characterCoinDeltas.push({
        characterId: char.id,
        coins_gp: gp,
        coins_sp: sp,
        coins_cp: cp,
      });
    }
  }

  let missionTreasurePayout: SessionEconomyPayload["missionTreasurePayout"];
  if (simple.missionTitle?.trim()) {
    const mission = missions.find((m) => {
      const key = normalizeEntityNameKey(simple.missionTitle!);
      const titleKey = normalizeEntityNameKey(m.title);
      return titleKey === key || titleKey.includes(key) || key.includes(titleKey);
    });
    if (!mission) {
      return { error: `Non trovo la missione «${simple.missionTitle}» per il tesoretto.` };
    }
    if (characterCoinDeltas.length > 0) {
      missionTreasurePayout = {
        missionId: mission.id,
        allocations: characterCoinDeltas.map((d) => ({
          characterId: d.characterId,
          coins_gp: d.coins_gp,
          coins_sp: d.coins_sp,
          coins_cp: d.coins_cp,
        })),
      };
      return {
        economy: { missionTreasurePayout, characterCoinDeltas: undefined },
        note: simple.notes,
        needsWizard: false,
      };
    }
    return { economy: undefined, note: simple.notes, needsWizard: true };
  }

  if (characterCoinDeltas.length > 0) {
    return {
      economy: { characterCoinDeltas },
      note: simple.notes,
      needsWizard: false,
    };
  }

  return { economy: undefined, note: simple.notes, needsWizard: true };
}

function computeMissingFields(options: {
  sessionAmbiguous: boolean;
  sessionCandidates: ScheduledSessionRow[];
  summary: string;
  userPrompt: string;
  attendanceErrors: string[];
  entityErrors: string[];
  unlockErrors: string[];
  economyNeedsWizard: boolean;
  wizardEconomyUrl: string;
}): SessionCloseMissingField[] {
  const missing: SessionCloseMissingField[] = [];

  if (options.sessionAmbiguous) {
    const list = options.sessionCandidates
      .slice(0, 5)
      .map((s) => sessionLabel(s))
      .join("; ");
    missing.push({
      id: "session_pick",
      severity: "blocking",
      question: `Quale sessione chiudere? Sessioni programmate: ${list}. Indica data o titolo.`,
    });
  }

  if (!options.summary.trim()) {
    const narrativeLen = options.userPrompt.trim().length;
    if (narrativeLen < 40) {
      missing.push({
        id: "summary",
        severity: "blocking",
        question:
          "Non ho abbastanza materiale per il riassunto. Descrivi cosa è successo in sessione (eventi, combattimenti, decisioni dei PG).",
      });
    }
  }

  for (const err of options.attendanceErrors) {
    missing.push({
      id: `attendance_${err}`,
      severity: "blocking",
      question: err,
    });
  }

  for (const err of options.entityErrors) {
    missing.push({
      id: `entity_${err}`,
      severity: "blocking",
      question: err,
    });
  }

  for (const err of options.unlockErrors) {
    missing.push({
      id: `unlock_${err}`,
      severity: "blocking",
      question: err,
    });
  }

  if (options.economyNeedsWizard) {
    missing.push({
      id: "economy_wizard",
      severity: "info",
      question: `Per tesoretti missione e trofei complessi apri il wizard: ${options.wizardEconomyUrl}`,
    });
  }

  return missing;
}

export function hasBlockingCloseMissingFields(
  fields: SessionCloseMissingField[]
): boolean {
  return fields.some((f) => f.severity === "blocking");
}

export function buildSessionCloseInput(
  campaignId: string,
  sessionId: string,
  resolved: SessionCloseResolvedDraft
): Record<string, unknown> {
  return {
    campaignId,
    sessionId,
    summary: resolved.summary,
    gmPrivateNotes: resolved.gmPrivateNotes,
    xpGained: resolved.xpGained,
    perPlayerXpAwards: resolved.perPlayerXpAwards.map((p) => ({
      playerId: p.playerId,
      xp: p.xp,
    })),
    elapsedHours: resolved.elapsedHours,
    attendance: resolved.attendance,
    unlockContent: resolved.unlockContent,
    unlockContentIds: resolved.unlockContentIds,
    entityStatusUpdates: resolved.entityStatusUpdates,
    economy: resolved.economy,
  };
}

export async function enrichSessionCloseProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    sessionCloseMeta?: ChatSessionCloseMeta | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      sessionCloseMeta: ChatSessionCloseMeta;
      assistantMessage: string;
      phase: "text" | "awaiting_close_info";
    }
  | { ok: false; error: string }
> {
  const userPrompt =
    options?.sessionCloseMeta?.userPrompt?.trim() || userMessage.trim();
  if (!userPrompt) {
    return {
      ok: false,
      error: "Descrivi la chiusura sessione (es. «chiudi la sessione di ieri, tutti presenti, 300 XP»).",
    };
  }

  const detected = detectSessionCloseRequest(userPrompt);
  const refineDetected = options?.refine ? detectSessionCloseRequest(userMessage.trim()) : null;
  const isLongCampaign = await loadCampaignIsLong(campaignId);
  const scheduledSessions = await loadScheduledSessions(campaignId);

  const sessionPick = resolveSessionId(
    scheduledSessions,
    refineDetected ?? detected,
    options?.sessionCloseMeta?.sessionId || undefined
  );

  if (!scheduledSessions.length) {
    return {
      ok: false,
      error: "Non ci sono sessioni programmate da chiudere in questa campagna.",
    };
  }

  const sessionRow = sessionPick.sessionId
    ? scheduledSessions.find((s) => s.id === sessionPick.sessionId)!
    : null;

  const signupsRes = sessionRow
    ? await getApprovedSignupsForSession(sessionRow.id)
    : { success: true as const, data: [] as SignupRow[] };

  const signups: SignupRow[] = (signupsRes.data ?? []).map((s) => ({
    player_id: s.player_id,
    player_name: s.player_name,
  }));

  const coreEntities = isLongCampaign ? await loadCoreEntities(campaignId) : [];
  const unlockRes = isLongCampaign ? await getUnlockableContent(campaignId) : { success: true, items: [] };
  const unlockable = (unlockRes.items ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    type: u.type,
  }));

  const { context: campaignContext } = await loadSessionCloseCampaignContext(campaignId);

  const genCtx: SessionCloseGenerationContext = {
    sessionLabel: sessionRow ? sessionLabel(sessionRow) : "sessione da scegliere",
    isLongCampaign,
    players: signups.map((s) => ({ playerId: s.player_id, playerName: s.player_name })),
    coreEntities,
    unlockable,
    campaignContext,
  };

  const chatMessages =
    options?.refine && options.sessionCloseMeta
      ? [
          ...options.sessionCloseMeta.chatMessages,
          { role: "user" as const, content: userMessage.trim() },
        ]
      : options?.sessionCloseMeta?.chatMessages ?? [];

  const combinedNarrative = [...chatMessages.map((m) => m.content), userPrompt].join("\n");

  const draftResult =
    options?.refine && options.sessionCloseMeta?.aiDraft
      ? await refineSessionCloseDraftFromPrompt(
          campaignId,
          userMessage.trim(),
          options.sessionCloseMeta.aiDraft,
          genCtx,
          chatMessages
        )
      : await generateSessionCloseDraftFromPrompt(
          campaignId,
          userPrompt,
          genCtx,
          chatMessages
        );

  if (!draftResult.ok) {
    return { ok: false, error: draftResult.error };
  }

  const aiDraft = draftResult.data;

  const attendanceErrors: string[] = [];
  for (const row of aiDraft.attendance) {
    if (!findPlayerByName(row.playerName, signups)) {
      attendanceErrors.push(
        `Non trovo il giocatore «${row.playerName}» tra gli iscritti. Chi era assente/presente?`
      );
    }
  }

  const attendance = sessionRow ? buildDefaultAttendance(signups, aiDraft.attendance) : {};

  const perPlayerXpAwards: SessionCloseResolvedDraft["perPlayerXpAwards"] = [];
  for (const row of aiDraft.perPlayerXp) {
    const player = findPlayerByName(row.playerName, signups);
    if (!player) {
      attendanceErrors.push(`Non trovo il giocatore «${row.playerName}» per l'XP personalizzato.`);
      continue;
    }
    perPlayerXpAwards.push({
      playerId: player.player_id,
      playerName: player.player_name,
      xp: row.xp,
    });
  }

  const entityStatusUpdates: Record<string, "alive" | "dead" | "missing"> = {};
  const entityErrors: string[] = [];
  const entityLabels: { name: string; status: string }[] = [];

  if (isLongCampaign) {
    for (const upd of aiDraft.entityUpdates) {
      const entity = findByName(upd.entityName, coreEntities);
      if (!entity) {
        entityErrors.push(
          `Non trovo l'entità core «${upd.entityName}». Specifica il nome esatto o correggi.`
        );
        continue;
      }
      entityStatusUpdates[entity.id] = upd.status;
      entityLabels.push({ name: entity.name, status: upd.status });
    }
  }

  const unlockContentIds: SessionCloseResolvedDraft["unlockContentIds"] = [];
  const unlockErrors: string[] = [];

  if (isLongCampaign) {
    for (const u of aiDraft.unlockContent) {
      const match =
        u.type === "map"
          ? unlockable.find((x) => x.type === "map" && normalizeEntityNameKey(x.name) === normalizeEntityNameKey(u.name))
          : u.type === "wiki"
            ? unlockable.find((x) => x.type === "wiki" && normalizeEntityNameKey(x.name) === normalizeEntityNameKey(u.name))
            : findByName(u.name, unlockable);

      if (!match) {
        unlockErrors.push(
          `Non trovo il contenuto segreto «${u.name}» da sbloccare. Indica il nome esatto.`
        );
        continue;
      }
      unlockContentIds.push({ id: match.id, type: match.type, name: match.name });
    }
  }

  const wizardEconomyUrl = `/campaigns/${campaignId}/gm-screen`;
  let economy: SessionEconomyPayload | undefined;
  let economyNote: string | null = null;
  let economyNeedsWizard = false;

  if (isLongCampaign && aiDraft.economyMentioned && sessionRow) {
    const econ = await resolveEconomy(campaignId, aiDraft, signups);
    if ("error" in econ && econ.error) {
      attendanceErrors.push(econ.error);
    } else if (!("error" in econ)) {
      economy = econ.economy;
      economyNote = econ.note;
      economyNeedsWizard = econ.needsWizard;
    }
  } else if (aiDraft.economyMentioned) {
    economyNeedsWizard = true;
  }

  const resolvedDraft: SessionCloseResolvedDraft = {
    summary: aiDraft.summary,
    gmPrivateNotes: aiDraft.gmPrivateNotes,
    xpGained: aiDraft.xpGained,
    perPlayerXpAwards,
    elapsedHours: aiDraft.elapsedHours,
    attendance,
    entityStatusUpdates,
    unlockContent: unlockContentIds.length > 0,
    unlockContentIds,
    economy,
  };

  const missingFields = computeMissingFields({
    sessionAmbiguous: sessionPick.ambiguous,
    sessionCandidates: sessionPick.candidates,
    summary: aiDraft.summary,
    userPrompt: combinedNarrative,
    attendanceErrors,
    entityErrors,
    unlockErrors,
    economyNeedsWizard,
    wizardEconomyUrl,
  });

  const attendanceResolved = signups.map((s) => ({
    playerName: s.player_name,
    status: attendance[s.player_id] ?? ("attended" as const),
  }));

  const assistantMessage = formatSessionCloseDraftForChat(aiDraft, {
    sessionLabel: sessionRow ? sessionLabel(sessionRow) : "—",
    attendanceResolved,
    unlockLabels: unlockContentIds.map((u) => `${u.name} (${u.type})`),
    entityLabels,
    economyNote,
    wizardEconomyUrl: economyNeedsWizard ? wizardEconomyUrl : null,
  });

  const sessionCloseMeta: ChatSessionCloseMeta = {
    userPrompt,
    sessionId: sessionRow?.id ?? "",
    sessionLabel: sessionRow ? sessionLabel(sessionRow) : "",
    campaignId,
    isLongCampaign,
    isPreClosed: sessionRow?.is_pre_closed === true,
    aiDraft,
    resolved: resolvedDraft,
    missingFields,
    wizardEconomyUrl,
    chatMessages: [
      ...(options?.sessionCloseMeta?.chatMessages ?? []),
      ...(options?.refine ? [{ role: "user" as const, content: userMessage.trim() }] : []),
      { role: "assistant", content: assistantMessage },
    ],
  };

  const phase: "text" | "awaiting_close_info" = hasBlockingCloseMissingFields(missingFields)
    ? "awaiting_close_info"
    : "text";

  const input =
    sessionRow && !sessionPick.ambiguous
      ? buildSessionCloseInput(campaignId, sessionRow.id, resolvedDraft)
      : {
          campaignId,
          sessionId: sessionRow?.id ?? "",
          summary: aiDraft.summary,
        };

  const previewPayload = {
    sessionLabel: sessionCloseMeta.sessionLabel,
    summary: aiDraft.summary.slice(0, 400),
    xpGained: aiDraft.xpGained,
    elapsedHours: aiDraft.elapsedHours,
    attendanceResolved,
    unlockLabels: unlockContentIds.map((u) => u.name),
    entityLabels,
    missingFields,
    economyNeedsWizard,
    wizardEconomyUrl,
    contentMarkdown: assistantMessage,
    assistantPreview: assistantMessage,
    error: sessionPick.ambiguous ? "Sessione da scegliere" : undefined,
  };

  let previewData: Record<string, unknown> = {};
  if (sessionRow && !sessionPick.ambiguous) {
    const previewed = await previewAction("session.close", input);
    if (previewed.success && previewed.data) {
      previewData = previewed.data as Record<string, unknown>;
    }
  }

  const enrichedProposal: PreviewedProposal = {
    ...proposal,
    action_name: "session.close",
    input,
    preview_payload: {
      ...previewPayload,
      ...previewData,
    },
  };

  return {
    ok: true,
    proposal: enrichedProposal,
    sessionCloseMeta,
    assistantMessage,
    phase,
  };
}

export function formatCloseMissingFieldsReply(
  fields: SessionCloseMissingField[]
): string {
  const blocking = fields.filter((f) => f.severity === "blocking");
  const info = fields.filter((f) => f.severity === "info");
  const lines: string[] = [];

  if (blocking.length) {
    lines.push("Mi servono ancora queste informazioni:");
    for (const f of blocking) lines.push(`- ${f.question}`);
  }

  if (info.length) {
    lines.push("", "Nota economia/trofei:");
    for (const f of info) lines.push(`- ${f.question}`);
  }

  return lines.join("\n");
}
