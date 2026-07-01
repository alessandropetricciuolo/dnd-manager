import { generateAiText } from "@/lib/ai/huggingface-client";
import {
  buildInterpreterActionList,
  isAiDraftAllowedAction,
} from "../actions/action-catalog";
import type { AiInterpreterResult } from "../types/ai-proposal";
import { formatContextForPrompt, type ResolvedCommandContext } from "./context-resolver";

const SYSTEM_RULES = `Sei l'assistente GM del Command Center di Barber & Dragons.
Sei parallelo al sistema manuale: proponi SOLO action ufficiali del registry, mai scritture dirette.
Modalità: bozze con conferma GM. Proponi al massimo 3 action.

Action consentite (usa esattamente questi nomi):
${buildInterpreterActionList()}

Regole:
- Per oneshot/campagne nuove usa campaign.create con type oneshot
- Per NPC/luoghi/lore usa wiki.entity.create
- Per note nella tab GM campagna usa gm.note.create
- Per missioni gilda usa mission.create
- Non inventare campaignId: usa quello del contesto se presente
- Per modifiche servono gli ID esistenti (entityId, missionId, sessionId, …)

Rispondi SOLO con JSON valido (senza markdown):
{
  "reply": "risposta conversazionale breve in italiano",
  "intent_summary": "riassunto intento in una frase",
  "proposals": [
    { "action_name": "...", "input": { ... }, "rationale": "perché proponi questa action" }
  ]
}

Se non serve proporre action, usa "proposals": [].`;

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export function parseInterpreterJson(raw: string): AiInterpreterResult {
  const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  const intent_summary =
    typeof parsed.intent_summary === "string" ? parsed.intent_summary.trim() : "";
  const proposalsRaw = Array.isArray(parsed.proposals) ? parsed.proposals : [];

  const proposals = proposalsRaw
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const o = p as Record<string, unknown>;
      const action_name = typeof o.action_name === "string" ? o.action_name.trim() : "";
      if (!isAiDraftAllowedAction(action_name)) return null;
      const input =
        o.input && typeof o.input === "object" && !Array.isArray(o.input)
          ? (o.input as Record<string, unknown>)
          : {};
      const rationale = typeof o.rationale === "string" ? o.rationale.trim() : "";
      return { action_name, input, rationale };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, 3);

  return {
    reply: reply || "Ho analizzato la richiesta.",
    intent_summary: intent_summary || "Richiesta GM",
    proposals,
  };
}

export async function interpretUserMessage(
  userMessage: string,
  context: ResolvedCommandContext
): Promise<AiInterpreterResult> {
  const contextBlock = formatContextForPrompt(context);
  const prompt = `${SYSTEM_RULES}

--- CONTESTO ---
${contextBlock}

--- RICHIESTA GM ---
${userMessage.trim()}`;

  const raw = await generateAiText(prompt);
  try {
    return parseInterpreterJson(raw);
  } catch (err) {
    console.error("[interpretUserMessage] JSON parse", err, raw.slice(0, 500));
    return {
      reply:
        "Ho letto la richiesta ma non sono riuscito a strutturare proposte automatiche. Puoi riformulare in modo più specifico?",
      intent_summary: "Parse fallito",
      proposals: [],
    };
  }
}
