import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { buildCampaignContextBlock } from "@/lib/campaign-context-prompt";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import { GUILD_RANK_LETTERS, parseGuildRank, type GuildRankLetter } from "@/lib/missions/guild-ranks";
import { extractJsonObject } from "@/modules/command-center/ai-control-plane/interpreter";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";

export type MissionAiDraft = {
  grade: GuildRankLetter;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
  pointsReward: number;
};

export type MissionDraftHints = Partial<MissionAiDraft>;

const GRADE_SET = new Set<string>(GUILD_RANK_LETTERS);

const CREATE_SYSTEM_PROMPT = `Sei un Game Master esperto di campagne D&D 5e in stile West Marches / bacheca gilda.

Il Master vuole pubblicare una nuova missione sulla bacheca della gilda.

Rispondi SOLO con JSON valido (senza markdown):
{
  "grade": "D | C | B | A | S",
  "title": "titolo breve ed evocativo",
  "committente": "chi commissiona (gilda, nobile, villaggio, ecc.)",
  "ubicazione": "luogo principale dell'incarico",
  "paga": "ricompensa in mo o beni (es. 150 mo, 2 pozioni)",
  "urgenza": "Bassa | Normale | Alta | Critica",
  "description": "scheda missione per il GM: obiettivi, contesto, ostacoli, indizi, 2-4 paragrafi in italiano",
  "points_reward": 0
}

Regole:
- Grado D = incarico semplice locale; S = minaccia epica o complotto maggiore
- points_reward: intero coerente col grado (D 5-15, C 15-35, B 35-75, A 75-150, S 150-300)
- La descrizione deve essere giocabile al tavolo, non meta-gioco
- Rispetta tono, magia e meccaniche della campagna se forniti nel contesto
- Scrivi in italiano`;

const REFINE_SYSTEM_PROMPT = `Sei un editor di missioni gilda D&D 5e. Aggiorna la bozza in base alle richieste del Master.

Rispondi SOLO con JSON valido (stesse chiavi di creazione):
grade, title, committente, ubicazione, paga, urgenza, description, points_reward`;

function normalizePointsReward(raw: unknown, grade: GuildRankLetter): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.trunc(raw));
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  const defaults: Record<GuildRankLetter, number> = {
    D: 10,
    C: 25,
    B: 50,
    A: 100,
    S: 200,
  };
  return defaults[grade];
}

function normalizeGrade(raw: unknown, fallback: GuildRankLetter = "C"): GuildRankLetter {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (GRADE_SET.has(value)) return value as GuildRankLetter;
  return fallback;
}

function ensureString(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
}

export function parseMissionDraftJson(
  raw: string,
  hints?: MissionDraftHints
): { ok: true; data: MissionAiDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return { ok: false, error: "Il modello non ha restituito JSON valido per la missione." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Risposta missione non è un oggetto JSON." };
  }

  const o = parsed as Record<string, unknown>;
  const grade = normalizeGrade(o.grade, hints?.grade ?? "C");
  const title = ensureString(o.title, hints?.title ?? "");
  const committente = ensureString(o.committente, hints?.committente ?? "Da definire");
  const ubicazione = ensureString(o.ubicazione, hints?.ubicazione ?? "Da definire");
  const paga = ensureString(o.paga, hints?.paga ?? "Da definire");
  const urgenza = ensureString(o.urgenza, hints?.urgenza ?? "Normale");
  const description = ensureString(o.description, hints?.description ?? "");
  const pointsReward = normalizePointsReward(o.points_reward ?? o.pointsReward, grade);

  if (!title) return { ok: false, error: "Titolo missione mancante nella risposta AI." };
  if (!description) return { ok: false, error: "Descrizione missione mancante nella risposta AI." };

  return {
    ok: true,
    data: {
      grade,
      title,
      committente,
      ubicazione,
      paga,
      urgenza,
      description,
      pointsReward,
    },
  };
}

export function formatMissionDraftForChat(draft: MissionAiDraft): string {
  return [
    `**${draft.title}** (grado ${draft.grade})`,
    `Committente: ${draft.committente}`,
    `Ubicazione: ${draft.ubicazione}`,
    `Paga: ${draft.paga} · Urgenza: ${draft.urgenza} · Punti: ${draft.pointsReward}`,
    "",
    draft.description,
  ].join("\n");
}

export function missionHintsFromInput(input: Record<string, unknown>): MissionDraftHints {
  const hints: MissionDraftHints = {};
  if (typeof input.grade === "string" && input.grade.trim()) {
    hints.grade = parseGuildRank(input.grade);
  }
  if (typeof input.title === "string" && input.title.trim()) hints.title = input.title.trim();
  if (typeof input.committente === "string" && input.committente.trim()) {
    hints.committente = input.committente.trim();
  }
  if (typeof input.ubicazione === "string" && input.ubicazione.trim()) {
    hints.ubicazione = input.ubicazione.trim();
  }
  if (typeof input.paga === "string" && input.paga.trim()) hints.paga = input.paga.trim();
  if (typeof input.urgenza === "string" && input.urgenza.trim()) hints.urgenza = input.urgenza.trim();
  if (typeof input.description === "string" && input.description.trim()) {
    hints.description = input.description.trim();
  }
  if (typeof input.pointsReward === "number" && Number.isFinite(input.pointsReward)) {
    hints.pointsReward = Math.max(0, Math.trunc(input.pointsReward));
  }
  return hints;
}

async function loadMissionGenerationContext(campaignId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("name, description, type, ai_context")
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !campaign) {
    return "Campagna senza contesto aggiuntivo: resta coerente con fantasy D&D 5e e bacheca gilda West Marches.";
  }

  const row = campaign as {
    name?: string | null;
    description?: string | null;
    type?: string | null;
    ai_context?: Json | null;
  };

  const blocks: string[] = [];
  if (row.name?.trim()) {
    blocks.push(`Campagna: ${row.name.trim()}`);
  }
  if (row.description?.trim()) {
    blocks.push(`Sinossi campagna:\n${row.description.trim()}`);
  }

  const ctx = parseCampaignAiContextFromDb(row.ai_context ?? null);
  blocks.push(buildCampaignContextBlock(ctx));

  if (row.type === "long") {
    const wikiMemory = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId);
    if (wikiMemory.trim()) {
      blocks.push(wikiMemory);
    }
  }

  return blocks.filter((block) => block.trim().length > 0).join("\n\n");
}

function formatHintsBlock(hints: MissionDraftHints | undefined): string {
  if (!hints) return "";
  const lines: string[] = [];
  if (hints.grade) lines.push(`Grado suggerito: ${hints.grade}`);
  if (hints.title) lines.push(`Titolo suggerito: ${hints.title}`);
  if (hints.committente) lines.push(`Committente: ${hints.committente}`);
  if (hints.ubicazione) lines.push(`Ubicazione: ${hints.ubicazione}`);
  if (hints.paga) lines.push(`Paga: ${hints.paga}`);
  if (hints.urgenza) lines.push(`Urgenza: ${hints.urgenza}`);
  if (hints.pointsReward != null) lines.push(`Punti premio: ${hints.pointsReward}`);
  if (hints.description) lines.push(`Note iniziali:\n${hints.description}`);
  if (!lines.length) return "";
  return `--- INDIZI DAL MESSAGGIO ---\n${lines.join("\n")}`;
}

export async function generateMissionDraftFromPrompt(
  campaignId: string,
  userPrompt: string,
  hints?: MissionDraftHints
): Promise<
  { ok: true; draft: MissionAiDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Descrivi la missione che vuoi pubblicare." };
  }

  const context = await loadMissionGenerationContext(campaignId);
  const hintsBlock = formatHintsBlock(hints);
  const prompt = [
    CREATE_SYSTEM_PROMPT,
    "",
    "--- CONTESTO CAMPAGNA ---",
    context,
    hintsBlock,
    "",
    "--- RICHIESTA MASTER ---",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.7, maxTokens: 1800 });
    const parsed = parseMissionDraftJson(raw, hints);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatMissionDraftForChat(parsed.data),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore generazione missione.";
    return { ok: false, error: msg };
  }
}

export async function refineMissionDraftFromPrompt(
  campaignId: string,
  userPrompt: string,
  currentDraft: MissionAiDraft
): Promise<
  { ok: true; draft: MissionAiDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const context = await loadMissionGenerationContext(campaignId);
  const prompt = [
    REFINE_SYSTEM_PROMPT,
    "",
    "--- CONTESTO CAMPAGNA ---",
    context,
    "",
    "--- BOZZA ATTUALE ---",
    JSON.stringify(
      {
        grade: currentDraft.grade,
        title: currentDraft.title,
        committente: currentDraft.committente,
        ubicazione: currentDraft.ubicazione,
        paga: currentDraft.paga,
        urgenza: currentDraft.urgenza,
        description: currentDraft.description,
        points_reward: currentDraft.pointsReward,
      },
      null,
      2
    ),
    "",
    "--- RICHIESTA MODIFICA ---",
    userPrompt.trim(),
  ].join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.55, maxTokens: 1800 });
    const parsed = parseMissionDraftJson(raw, currentDraft);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatMissionDraftForChat(parsed.data),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore aggiornamento bozza missione.";
    return { ok: false, error: msg };
  }
}
