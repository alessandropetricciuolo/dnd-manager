import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { buildCampaignContextBlock } from "@/lib/campaign-context-prompt";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import { extractJsonObject } from "@/modules/command-center/ai-control-plane/interpreter";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";

export type SessionCloseAttendanceDraft = {
  playerName: string;
  status: "attended" | "absent";
};

export type SessionCloseEntityDraft = {
  entityName: string;
  status: "alive" | "dead" | "missing";
};

export type SessionCloseUnlockDraft = {
  name: string;
  type: "wiki" | "map" | "auto";
};

export type SessionCloseCoinDraft = {
  characterName: string;
  coins_gp?: number;
  coins_sp?: number;
  coins_cp?: number;
};

export type SessionCloseAiDraft = {
  summary: string;
  gmPrivateNotes: string | null;
  xpGained: number;
  perPlayerXp: { playerName: string; xp: number }[];
  elapsedHours: number;
  attendance: SessionCloseAttendanceDraft[];
  entityUpdates: SessionCloseEntityDraft[];
  unlockContent: SessionCloseUnlockDraft[];
  economyMentioned: boolean;
  economySimple: {
    missionTitle: string | null;
    characterCoins: SessionCloseCoinDraft[];
    notes: string | null;
  } | null;
};

export type SessionCloseContextPlayer = {
  playerId: string;
  playerName: string;
};

export type SessionCloseContextEntity = {
  id: string;
  name: string;
  type: string;
  globalStatus: "alive" | "dead" | "missing";
};

export type SessionCloseContextUnlock = {
  id: string;
  name: string;
  type: "wiki" | "map";
};

export type SessionCloseGenerationContext = {
  sessionLabel: string;
  isLongCampaign: boolean;
  players: SessionCloseContextPlayer[];
  coreEntities: SessionCloseContextEntity[];
  unlockable: SessionCloseContextUnlock[];
  campaignContext: string;
};

const CREATE_SYSTEM_PROMPT = `Sei l'assistente di un Game Master D&D 5e che chiude una sessione di gioco.

Dal messaggio del Master (e dalla conversazione) estrai i dati per il debrief/chiusura sessione.

Rispondi SOLO con JSON valido:
{
  "summary": "riassunto pubblico della sessione in italiano (2-6 paragrafi se c'è materiale narrativo)",
  "gm_private_notes": "note segrete GM o null",
  "xp_gained": 0,
  "per_player_xp": [{"player_name": "Nome", "xp": 300}],
  "elapsed_hours": 0,
  "attendance": [{"player_name": "Nome", "status": "attended"|"absent"}],
  "entity_updates": [{"entity_name": "Nome NPC/Luogo", "status": "alive"|"dead"|"missing"}],
  "unlock_content": [{"name": "nome contenuto", "type": "wiki"|"map"|"auto"}],
  "economy_mentioned": false,
  "economy_simple": {
    "mission_title": "titolo missione o null",
    "character_coins": [{"character_name": "Nome PG", "coins_gp": 0, "coins_sp": 0, "coins_cp": 0}],
    "notes": "testo libero su monete/tesori o null"
  }
}

Regole:
- Genera il summary in autonomia interpretando cosa è successo in sessione; se il messaggio non contiene alcun materiale narrativo, lascia summary vuoto ("").
- xp_gained: XP base per tutti i presenti (0 se non menzionato).
- per_player_xp: solo override per giocatori specifici.
- attendance: includi solo giocatori con status esplicitamente diverso dal default (assente) o se il Master elenca presenze; se dice "tutti presenti" non serve elencare.
- entity_updates: solo per NPC/luoghi il cui stato cambia (morto, disperso, ecc.) — solo campagne long.
- unlock_content: contenuti segreti da sbloccare ai presenti.
- economy_mentioned: true se il Master parla di monete, tesori, missioni completate, distribuzione loot.
- economy_simple: solo per aggiustamenti semplici (es. "+50 mo a Marco"); per distribuzioni complesse del tesoretto missione lascia character_coins vuoto e metti notes.
- Scrivi in italiano.`;

const REFINE_SYSTEM_PROMPT = `Aggiorna il draft di chiusura sessione in base alle nuove indicazioni del Master.

Rispondi SOLO con lo stesso JSON della creazione, integrando o correggendo i campi.`;

function ensureString(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw.trim() : fallback;
}

function optionalNullableString(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length ? value : null;
}

function normalizeNonNegInt(raw: unknown, fallback = 0): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.trunc(raw));
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return fallback;
}

function normalizeAttendanceStatus(raw: unknown): "attended" | "absent" | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (["attended", "presente", "present", "c'era", "cera"].includes(value)) return "attended";
  if (["absent", "assente", "assenza", "non c'era", "mancato"].includes(value)) return "absent";
  if (value === "attended" || value === "absent") return value;
  return null;
}

function normalizeEntityStatus(raw: unknown): "alive" | "dead" | "missing" | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (["alive", "vivo", "viva", "vivente"].includes(value)) return "alive";
  if (["dead", "morto", "morta", "ucciso", "uccisa", "morti"].includes(value)) return "dead";
  if (["missing", "disperso", "dispersa", "scomparso", "scomparsa"].includes(value)) return "missing";
  if (value === "alive" || value === "dead" || value === "missing") return value;
  return null;
}

function normalizeUnlockType(raw: unknown): "wiki" | "map" | "auto" {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "map" || value === "mappa") return "map";
  if (value === "wiki") return "wiki";
  return "auto";
}

export function parseSessionCloseDraftJson(
  raw: string
): { ok: true; data: SessionCloseAiDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return { ok: false, error: "Il modello non ha restituito JSON valido per la chiusura sessione." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Risposta chiusura sessione non è un oggetto JSON." };
  }

  const o = parsed as Record<string, unknown>;

  const attendance: SessionCloseAttendanceDraft[] = [];
  if (Array.isArray(o.attendance)) {
    for (const row of o.attendance) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const playerName = ensureString(r.player_name ?? r.playerName);
      const status = normalizeAttendanceStatus(r.status);
      if (playerName && status) attendance.push({ playerName, status });
    }
  }

  const perPlayerXp: { playerName: string; xp: number }[] = [];
  if (Array.isArray(o.per_player_xp)) {
    for (const row of o.per_player_xp) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const playerName = ensureString(r.player_name ?? r.playerName);
      const xp = normalizeNonNegInt(r.xp);
      if (playerName && xp > 0) perPlayerXp.push({ playerName, xp });
    }
  }

  const entityUpdates: SessionCloseEntityDraft[] = [];
  if (Array.isArray(o.entity_updates)) {
    for (const row of o.entity_updates) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const entityName = ensureString(r.entity_name ?? r.entityName);
      const status = normalizeEntityStatus(r.status);
      if (entityName && status) entityUpdates.push({ entityName, status });
    }
  }

  const unlockContent: SessionCloseUnlockDraft[] = [];
  if (Array.isArray(o.unlock_content)) {
    for (const row of o.unlock_content) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = ensureString(r.name);
      if (name) unlockContent.push({ name, type: normalizeUnlockType(r.type) });
    }
  }

  let economySimple: SessionCloseAiDraft["economySimple"] = null;
  const economyMentioned = o.economy_mentioned === true || o.economyMentioned === true;
  if (o.economy_simple && typeof o.economy_simple === "object" && !Array.isArray(o.economy_simple)) {
    const e = o.economy_simple as Record<string, unknown>;
    const characterCoins: SessionCloseCoinDraft[] = [];
    if (Array.isArray(e.character_coins)) {
      for (const row of e.character_coins) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const characterName = ensureString(r.character_name ?? r.characterName);
        if (!characterName) continue;
        characterCoins.push({
          characterName,
          coins_gp: normalizeNonNegInt(r.coins_gp),
          coins_sp: normalizeNonNegInt(r.coins_sp),
          coins_cp: normalizeNonNegInt(r.coins_cp),
        });
      }
    }
    economySimple = {
      missionTitle: optionalNullableString(e.mission_title ?? e.missionTitle),
      characterCoins,
      notes: optionalNullableString(e.notes),
    };
  }

  return {
    ok: true,
    data: {
      summary: ensureString(o.summary),
      gmPrivateNotes: optionalNullableString(o.gm_private_notes ?? o.gmPrivateNotes),
      xpGained: normalizeNonNegInt(o.xp_gained ?? o.xpGained),
      perPlayerXp,
      elapsedHours: normalizeNonNegInt(o.elapsed_hours ?? o.elapsedHours),
      attendance,
      entityUpdates,
      unlockContent,
      economyMentioned,
      economySimple,
    },
  };
}

export async function loadSessionCloseCampaignContext(campaignId: string): Promise<{
  context: string;
  isLongCampaign: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("name, description, type, ai_context")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    return { isLongCampaign: false, context: "Fantasy D&D 5e." };
  }

  const row = campaign as {
    name?: string | null;
    description?: string | null;
    type?: string | null;
    ai_context?: Json | null;
  };

  const blocks: string[] = [];
  if (row.name?.trim()) blocks.push(`Campagna: ${row.name.trim()}`);
  if (row.description?.trim()) blocks.push(`Sinossi:\n${row.description.trim()}`);
  blocks.push(buildCampaignContextBlock(parseCampaignAiContextFromDb(row.ai_context ?? null)));

  const isLongCampaign = row.type === "long";
  if (isLongCampaign) {
    const wiki = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId);
    if (wiki.trim()) blocks.push(wiki);
  }

  return { context: blocks.join("\n\n"), isLongCampaign };
}

function formatContextBlock(ctx: SessionCloseGenerationContext): string {
  const lines = [
    `Sessione: ${ctx.sessionLabel}`,
    ctx.isLongCampaign ? "Tipo campagna: long (mondo, sblocchi, economia)" : "Tipo campagna: oneshot/quest",
  ];

  if (ctx.players.length) {
    lines.push(
      "Giocatori iscritti:",
      ...ctx.players.map((p) => `- ${p.playerName} (id: ${p.playerId})`)
    );
  }

  if (ctx.isLongCampaign && ctx.coreEntities.length) {
    lines.push(
      "Entità core wiki:",
      ...ctx.coreEntities.slice(0, 40).map(
        (e) => `- ${e.name} (${e.type}, stato attuale: ${e.globalStatus})`
      )
    );
  }

  if (ctx.isLongCampaign && ctx.unlockable.length) {
    lines.push(
      "Contenuti sbloccabili (segreti):",
      ...ctx.unlockable.slice(0, 30).map((u) => `- ${u.name} (${u.type})`)
    );
  }

  lines.push("", ctx.campaignContext);
  return lines.join("\n");
}

function formatChatHistory(
  messages: { role: "user" | "assistant"; content: string }[]
): string {
  if (!messages.length) return "";
  return messages.map((m) => `${m.role === "user" ? "Master" : "Assistente"}: ${m.content}`).join("\n\n");
}

export function formatSessionCloseDraftForChat(
  draft: SessionCloseAiDraft,
  options: {
    sessionLabel: string;
    attendanceResolved: { playerName: string; status: "attended" | "absent" }[];
    unlockLabels: string[];
    entityLabels: { name: string; status: string }[];
    economyNote?: string | null;
    wizardEconomyUrl?: string | null;
  }
): string {
  const lines = [
    `**Chiusura sessione** — ${options.sessionLabel}`,
    "",
    "### Riassunto",
    draft.summary || "_(da completare)_",
  ];

  if (draft.gmPrivateNotes) {
    lines.push("", "### Note GM (private)", draft.gmPrivateNotes);
  }

  lines.push(
    "",
    "### Logistica",
    `XP base: ${draft.xpGained}`,
    `Ore di gioco: ${draft.elapsedHours}`,
    `Presenze: ${options.attendanceResolved.map((a) => `${a.playerName} (${a.status === "attended" ? "presente" : "assente"})`).join(", ")}`
  );
  if (draft.perPlayerXp.length) {
    lines.push(
      `XP per giocatore: ${draft.perPlayerXp.map((p) => `${p.playerName} +${p.xp}`).join(", ")}`
    );
  }

  if (options.entityLabels.length) {
    lines.push(
      "",
      "### Stato mondo",
      ...options.entityLabels.map((e) => `- ${e.name}: ${e.status}`)
    );
  }

  if (options.unlockLabels.length) {
    lines.push("", "### Sblocchi contenuto", ...options.unlockLabels.map((n) => `- ${n}`));
  }

  if (options.economyNote) {
    lines.push("", "### Economia (chat)", options.economyNote);
  }

  if (options.wizardEconomyUrl && draft.economyMentioned) {
    lines.push(
      "",
      `Per tesoretti missione e trofei complessi usa il [wizard chiusura sessione](${options.wizardEconomyUrl}).`
    );
  }

  return lines.join("\n");
}

export async function generateSessionCloseDraftFromPrompt(
  campaignId: string,
  userPrompt: string,
  ctx: SessionCloseGenerationContext,
  chatMessages?: { role: "user" | "assistant"; content: string }[]
): Promise<{ ok: true; data: SessionCloseAiDraft } | { ok: false; error: string }> {
  const history = formatChatHistory(chatMessages ?? []);
  const prompt = [
    CREATE_SYSTEM_PROMPT,
    "",
    formatContextBlock(ctx),
    history ? `--- CONVERSAZIONE ---\n${history}` : null,
    `--- RICHIESTA MASTER ---\n${userPrompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.35, maxTokens: 2500 });
    if (!raw?.trim()) {
      return { ok: false, error: "Il modello non ha restituito testo per la chiusura sessione." };
    }
    return parseSessionCloseDraftJson(raw);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore generazione bozza chiusura sessione.",
    };
  }
}

export async function refineSessionCloseDraftFromPrompt(
  campaignId: string,
  refineMessage: string,
  previous: SessionCloseAiDraft,
  ctx: SessionCloseGenerationContext,
  chatMessages?: { role: "user" | "assistant"; content: string }[]
): Promise<{ ok: true; data: SessionCloseAiDraft } | { ok: false; error: string }> {
  const history = formatChatHistory(chatMessages ?? []);
  const prompt = [
    REFINE_SYSTEM_PROMPT,
    "",
    formatContextBlock(ctx),
    `--- BOZZA ATTUALE ---\n${JSON.stringify(previous, null, 2)}`,
    history ? `--- CONVERSAZIONE ---\n${history}` : null,
    `--- MODIFICA RICHIESTA ---\n${refineMessage}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.3, maxTokens: 2500 });
    if (!raw?.trim()) {
      return { ok: false, error: "Il modello non ha restituito testo per l'aggiornamento." };
    }
    return parseSessionCloseDraftJson(raw);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento bozza chiusura sessione.",
    };
  }
}
