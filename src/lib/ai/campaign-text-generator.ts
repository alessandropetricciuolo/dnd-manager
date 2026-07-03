import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { CAMPAIGN_TYPE_VALUES, type CampaignType } from "@/lib/campaign-type";
import { extractJsonObject } from "@/modules/command-center/ai-control-plane/interpreter";
import {
  AUTO_NAME_CAMPAIGN_HINT,
  isPlaceholderCampaignTitle,
} from "@/lib/ai/contextual-names";

export type CampaignAiDraft = {
  title: string;
  description: string;
  type: CampaignType;
  playerPrimer: string | null;
  isPublic: boolean;
};

const CAMPAIGN_TYPE_SET = new Set<string>(CAMPAIGN_TYPE_VALUES);

const CREATE_SYSTEM_PROMPT = `Sei un Game Designer esperto per D&D 5e. Il Master vuole creare una nuova campagna.

Il tuo compito principale è aiutarlo a scrivere una **descrizione per il GM** chiara e ricca: ambientazione, hook narrativo, tono, conflitti, atmosfera. Questo testo diventerà la **memoria di base della campagna** e guiderà la generazione delle voci wiki.

Rispondi SOLO con JSON valido (senza markdown):
{
  "title": "titolo evocativo della campagna",
  "description": "descrizione per il GM: ambientazione, hook, tono, 2-4 paragrafi in italiano",
  "type": "oneshot | quest | long | torneo",
  "player_primer": "guida del giocatore in Markdown (cosa sanno i PG, regole di tavolo, tono) — obbligatoria e ricca se type=long, altrimenti stringa vuota",
  "is_public": false
}

Regole:
- Se il tipo è già indicato nel prompt, NON cambiarlo
- Campagna lunga / saga → type "long" e player_primer completa
- One shot → type "oneshot", player_primer vuoto
- Quest breve → type "quest"
- Torneo → type "torneo"
- is_public resta false salvo richiesta esplicita di visibilità pubblica
- La description deve essere autosufficiente per orientare futuri NPC, luoghi e lore wiki
- Scrivi in italiano`;

const REFINE_SYSTEM_PROMPT = `Sei un editor di proposte campagna D&D 5e. Aggiorna la bozza in base alle richieste del Master.

Rispondi SOLO con JSON valido (stesse chiavi di creazione):
title, description, type, player_primer, is_public`;

function normalizeCampaignType(raw: unknown): CampaignType {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (CAMPAIGN_TYPE_SET.has(value)) return value as CampaignType;
  return "oneshot";
}

export function parseCampaignDraftJson(raw: string): { ok: true; data: CampaignAiDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return { ok: false, error: "Il modello non ha restituito JSON valido per la campagna." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Risposta campagna non è un oggetto JSON." };
  }

  const o = parsed as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  const type = normalizeCampaignType(o.type);
  const playerPrimerRaw = typeof o.player_primer === "string" ? o.player_primer.trim() : "";
  const isPublic = o.is_public === true;

  if (!title || isPlaceholderCampaignTitle(title)) {
    return { ok: false, error: "Titolo campagna mancante o generico nella risposta AI." };
  }
  if (!description) return { ok: false, error: "Descrizione campagna mancante nella risposta AI." };

  const playerPrimer =
    type === "long" ? playerPrimerRaw || description.slice(0, 800) : null;

  return {
    ok: true,
    data: {
      title,
      description,
      type,
      playerPrimer,
      isPublic,
    },
  };
}

export function formatCampaignDraftForChat(draft: CampaignAiDraft): string {
  const lines = [
    `**${draft.title}**`,
    `Tipo: ${draft.type}`,
    "",
    "**Descrizione (GM)**",
    draft.description,
  ];
  if (draft.type === "long" && draft.playerPrimer?.trim()) {
    lines.push("", "**Guida del giocatore**", draft.playerPrimer.trim());
  }
  return lines.join("\n");
}

export async function generateCampaignDraftFromPrompt(
  userPrompt: string,
  options?: { titleIsPlaceholder?: boolean; forcedType?: CampaignType }
): Promise<
  { ok: true; draft: CampaignAiDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const typeHint = options?.forcedType
    ? `\nTIPO GIÀ DECISO DAL MASTER: "${options.forcedType}" — non cambiarlo nel JSON.\n`
    : "";

  const prompt = `${CREATE_SYSTEM_PROMPT}
${typeHint}
${options?.titleIsPlaceholder ? `${AUTO_NAME_CAMPAIGN_HINT}\n` : ""}--- RICHIESTA MASTER ---
${userPrompt.trim()}`;

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.65, maxTokens: 2200 });
    const parsed = parseCampaignDraftJson(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const draft = options?.forcedType
      ? { ...parsed.data, type: options.forcedType }
      : parsed.data;

    return {
      ok: true,
      draft,
      assistantMessage: formatCampaignDraftForChat(draft),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore generazione campagna.";
    return { ok: false, error: msg };
  }
}

export async function refineCampaignDraftFromPrompt(
  userPrompt: string,
  currentDraft: CampaignAiDraft
): Promise<{ ok: true; draft: CampaignAiDraft; assistantMessage: string } | { ok: false; error: string }> {
  const prompt = `${REFINE_SYSTEM_PROMPT}

--- BOZZA ATTUALE ---
${JSON.stringify(
  {
    title: currentDraft.title,
    description: currentDraft.description,
    type: currentDraft.type,
    player_primer: currentDraft.playerPrimer ?? "",
    is_public: currentDraft.isPublic,
  },
  null,
  2
)}

--- RICHIESTA MODIFICA ---
${userPrompt.trim()}`;

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.55, maxTokens: 2200 });
    const parsed = parseCampaignDraftJson(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatCampaignDraftForChat(parsed.data),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore aggiornamento bozza campagna.";
    return { ok: false, error: msg };
  }
}

export function buildArchitectDescriptionFromDraft(draft: CampaignAiDraft): string {
  const parts = [draft.description.trim()];
  if (draft.playerPrimer?.trim()) {
    parts.push(`Guida del giocatore:\n${draft.playerPrimer.trim()}`);
  }
  return parts.join("\n\n");
}
