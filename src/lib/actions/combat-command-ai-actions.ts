"use server";

import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";
import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { COMBAT_STATUS_CATALOG, getCombatStatusDefinition } from "@/lib/combat-conditions";
import type {
  CombatCommandMissingData,
  CombatCommandOperation,
  CombatCommandProposal,
  CombatCommandUnresolvedTarget,
} from "@/lib/fight-mode/types";
import { validateAiCombatPayload } from "@/lib/fight-mode/combat-command-ai-schema";
import { authorizeCombatCommandAi } from "@/lib/fight-mode/combat-command-ai-access";

export type InterpretCombatCommandAiInput = {
  campaignId?: string;
  rawInput: string;
  combatants: Array<{
    id: string;
    name: string;
    type?: "pc" | "monster" | "custom";
    hp?: number;
    maxHp?: number;
  }>;
  stateSignatureAtCreation: string;
};

export type InterpretCombatCommandAiResult =
  | { success: true; proposal: CombatCommandProposal }
  | { success: false; error: string };

function makeOpId(): string {
  return `op-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function interpretCombatCommandWithAiAction(
  input: InterpretCombatCommandAiInput
): Promise<InterpretCombatCommandAiResult> {
  if (!input || typeof input !== "object") return { success: false, error: "Richiesta comando non valida." };
  const rawInput = typeof input.rawInput === "string" ? input.rawInput.trim() : "";
  if (!rawInput || rawInput.length > 2000 || typeof input.stateSignatureAtCreation !== "string" || !input.stateSignatureAtCreation || input.stateSignatureAtCreation.length > 20000 || (input.campaignId !== undefined && (typeof input.campaignId !== "string" || !input.campaignId.trim() || input.campaignId.length > 120)) || !Array.isArray(input.combatants) || input.combatants.length > 100) {
    return { success: false, error: "Nessun comando fornito da interpretare." };
  }
  if (input.combatants.some((c) => !c || typeof c.id !== "string" || !c.id.trim() || c.id.length > 120 || typeof c.name !== "string" || !c.name.trim() || c.name.length > 160 || (c.type !== undefined && !["pc", "monster", "custom"].includes(c.type)) || (c.hp !== undefined && (!Number.isInteger(c.hp) || c.hp < 0 || c.hp > 10000)) || (c.maxHp !== undefined && (!Number.isInteger(c.maxHp) || c.maxHp < 0 || c.maxHp > 10000)))) {
    return { success: false, error: "Dati dei combattenti non validi." };
  }
  if (new Set(input.combatants.map((c) => c.id)).size !== input.combatants.length) return { success: false, error: "ID combattente duplicati." };

  const authorization = await authorizeCombatCommandAi(input.campaignId, getRequestAuthContext, async (campaignId) => {
    const { createSupabaseServerClient } = await import("@/utils/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data: campaign } = await supabase.from("campaigns").select("gm_id").eq("id", campaignId).maybeSingle();
    return campaign?.gm_id ?? null;
  });
  if (!authorization.authorized) return { success: false, error: authorization.error };

  // 2. Controllo disponibilità OpenRouter
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return {
      success: false,
      error: "OpenRouter non configurato (OPENROUTER_API_KEY non presente nelle variabili d'ambiente). Puoi comunque usare l'analisi con il parser locale deterministico.",
    };
  }

  const combatantSummary = input.combatants
    .map((c) => `- ID: "${c.id}", Nome: "${c.name}", Ruolo: ${c.type ?? "sconosciuto"}, PF: ${c.hp ?? "?"}/${c.maxHp ?? "?"}`)
    .join("\n");

  const catalogSummary = COMBAT_STATUS_CATALOG.map(
    (s) => `- ${s.id} (${s.label}, categoria: ${s.category}${s.requiresConcentration ? ", richiede concentrazione" : ""})`
  ).join("\n");

  const systemInstructions = `Sei l'assistente tattico del Game Master per Barber & Dragons (D&D 5e).
Il tuo compito è tradurre la frase o dettatura del Master in un piano di operazioni atomiche sul combattimento.

COMBATTENTI IN INIZIATIVA:
${combatantSummary || "(Nessun combattente registrato)"}

CATALOGO CONDIZIONI E STATI DISPONIBILI:
${catalogSummary}

REGOLE CRITICHE E DI SICUREZZA (ZERO ALLUCINAZIONE):
1. NON INVENTARE CD, durate, tiri salvezza o incantesimi non esplicitamente detti dal Master o presenti nel catalogo.
2. Distingui tassativamente:
   - "damage": danno effettivo subito (PF calano).
   - "heal": guarigione (PF salgono).
   - "set_exact_hp": rettifica manuale dei PF a un valore esatto fissato dal master (es. "imposta pf a 20", "resetta a 15 pf"). NON confondere con danno o cura!
   - "add_effect": applica una condizione o buff dal catalogo o custom.
   - "remove_effect": rimuove una condizione o buff.
   - "start_concentration": il combattente inizia a concentrarsi su un incantesimo.
   - "break_concentration": interrompe la concentrazione del combattente.
3. Se l'ammontare di danno o cura non è specificato, NON INVENTARLO: ometti il campo numerico nell'operazione. L'app richiederà il valore collegandolo all'operazione corretta. Lascia "missingData" vuoto.
4. Se il bersaglio è ambiguo o non trovato tra i combattenti registrati, inseriscilo in "unresolvedTargets".
5. Se il Master indica un gruppo ("tutti i goblin", "tutti i mostri", "tutti"), genera una singola operazione per ciascun combattente del gruppo.
6. Per un effetto di incantesimo che richiede concentrazione (es. "Kaelen casta benedizione su Varis e Thorin"), usa una sola operazione "add_effect" per bersaglio, con sourceCasterId Kaelen, spellName "Benedizione" e linkToConcentration: true. Non aggiungere anche start_concentration: l'applicazione dell'effetto crea/aggiorna la concentrazione. Se il caster non è specificato, chiedilo in missingData.
7. Se il Master dice semplicemente "Kaelen perde concentrazione" o "interrompi concentrazione su Kaelen", genera "break_concentration".

DEVI RISPONDERE ESCLUSIVAMENTE CON UN OGGETTO JSON con la seguente struttura:
Ogni operazione è una union discriminata da "kind": includi SOLO i campi pertinenti a quel kind; non inviare chiavi degli altri kind e non usare valori null per i campi assenti. Esempio valido: {"kind":"damage","targetId":"ID_ESATTO","amount":8}.
{
  "explanation": "Spiegazione sintetica di ciò che è stato compreso in italiano",
  "operations": [
    {
      "kind": "damage" | "heal" | "set_exact_hp" | "add_effect" | "remove_effect" | "start_concentration" | "break_concentration",
      "targetId": "string (ID esatto del combattente dal sommario)",
      "targetName": "string",
      "amount": 10, // solo per damage e heal
      "exactHp": 20, // solo per set_exact_hp
      "statusId": "string (ID dal catalogo o custom:nome)",
      "label": "string (etichetta leggibile dello stato)",
      "sourceCasterId": "string (opzionale, ID del caster)",
      "sourceName": "string (opzionale)",
      "linkToConcentration": false,
      "durationTurns": null,
      "casterId": "string (solo per start_concentration o break_concentration)",
      "casterName": "string",
      "spellName": "string",
      "targetIds": ["string"],
      "linkedStatusId": "string"
    }
  ],
  "unresolvedTargets": [
    {
      "query": "nome cercato",
      "reason": "not_found" | "ambiguous",
      "candidateNames": ["nome1", "nome2"]
    }
  ],
  "missingData": [
    {
      "field": "amount",
      "message": "Specifica la quantità di danno per Goblin 1"
    }
  ]
}`;

  try {
    const userPrompt = `${systemInstructions}\n\nCOMANDO DEL MASTER DA INTERPRETARE:\n"${rawInput}"`;

    const aiResponseText = await generateOpenRouterChat(userPrompt, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 1200,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(aiResponseText);
    } catch {
      return {
        success: false,
        error: "L'IA ha restituito una risposta non valida o malformata. Riprova o usa il parser locale.",
      };
    }

    const validation = validateAiCombatPayload(parsed);
    if (!validation.success) return { success: false, error: validation.error };
    const validated = validation.data;
    if (validated.missingData?.length) return { success: false, error: "La risposta IA ha segnalato dati mancanti senza collegarli a un'operazione precisa. Riprova l'analisi." };
    const knownIds = new Set(input.combatants.map((c) => c.id));
    const validStatusId = (statusId: string) => Boolean(getCombatStatusDefinition(statusId)) || /^custom:[a-z0-9àèéìòù_-]{1,80}$/i.test(statusId);
    for (const op of validated.operations) {
      const objectIds = "targetId" in op ? [op.targetId] : "casterId" in op && op.casterId ? [op.casterId] : [];
      if (objectIds.some((id) => !knownIds.has(id))) return { success: false, error: "L'IA ha indicato un ID combattente non presente nello stato corrente." };
      if ("sourceCasterId" in op && op.sourceCasterId && !knownIds.has(op.sourceCasterId)) return { success: false, error: "L'IA ha indicato un caster non presente nello stato corrente." };
      if ("targetIds" in op && op.targetIds?.some((id) => !knownIds.has(id))) return { success: false, error: "L'IA ha indicato un bersaglio di concentrazione non presente nello stato corrente." };
      if ("statusId" in op && op.statusId && !validStatusId(op.statusId)) return { success: false, error: "L'IA ha indicato uno stato non presente nel catalogo e non dichiarato custom." };
      if ("linkedStatusId" in op && op.linkedStatusId && !validStatusId(op.linkedStatusId)) return { success: false, error: "L'IA ha indicato uno stato collegato non valido." };
    }
    if (validated.operations.some((start) => start.kind === "start_concentration" && validated.operations.some((effect) => effect.kind === "add_effect" && effect.linkToConcentration && effect.sourceCasterId === start.casterId && effect.spellName?.toLowerCase() === start.spellName?.toLowerCase()))) {
      return { success: false, error: "La risposta IA contiene una concentrazione duplicata. Riprova l'analisi." };
    }

    const operations: CombatCommandOperation[] = [];
    const unresolvedTargets: CombatCommandUnresolvedTarget[] = [];
    const missingData: CombatCommandMissingData[] = [];

    const combatantsById = new Map<string, (typeof input.combatants)[0]>();
    for (const c of input.combatants) {
      combatantsById.set(c.id, c);
    }

    // Processa unresolvedTargets segnalati dall'IA
    if (Array.isArray(validated.unresolvedTargets)) {
      for (const ut of validated.unresolvedTargets) {
        if (typeof ut === "object" && ut !== null) {
          const query = String(ut.query || "").trim();
          const reason = ut.reason === "ambiguous" ? "ambiguous" : "not_found";
          const candidates: Array<{ id: string; name: string }> = [];
          if (Array.isArray(ut.candidateNames)) {
            for (const cName of ut.candidateNames) {
              const match = input.combatants.find(
                (c) => c.name.toLowerCase() === String(cName).toLowerCase()
              );
              if (match) candidates.push({ id: match.id, name: match.name });
            }
          }
          if (query) {
            unresolvedTargets.push({
              query,
              reason,
              candidates: candidates.length > 0 ? candidates : undefined,
            });
          }
        }
      }
    }

    // Processa operations
    if (Array.isArray(validated.operations)) {
      for (const rawOpValue of validated.operations) {
        const rawOp = rawOpValue as unknown as Record<string, unknown> & { kind: string };
        if (!rawOp || typeof rawOp !== "object") continue;
        const opId = makeOpId();
        const kind = String(rawOp.kind || "").trim();

        if (kind === "damage") {
          const target = combatantsById.get(String(rawOp.targetId || ""));
          if (!target) {
            unresolvedTargets.push({
              query: String(rawOp.targetName || rawOp.targetId || "bersaglio sconosciuto"),
              reason: "not_found",
            });
            continue;
          }
          const amount = typeof rawOp.amount === "number" ? Math.max(0, Math.trunc(rawOp.amount)) : 0;
          if (amount <= 0) {
            missingData.push({
              operationId: opId,
              field: "amount",
              message: `Specifica la quantità di danno per ${target.name}.`,
            });
          }
          operations.push({
            id: opId,
            kind: "damage",
            targetId: target.id,
            targetName: target.name,
            amount,
            sourceLabel: rawOp.sourceLabel ? String(rawOp.sourceLabel) : undefined,
          });
        } else if (kind === "heal") {
          const target = combatantsById.get(String(rawOp.targetId || ""));
          if (!target) {
            unresolvedTargets.push({
              query: String(rawOp.targetName || rawOp.targetId || "bersaglio sconosciuto"),
              reason: "not_found",
            });
            continue;
          }
          const amount = typeof rawOp.amount === "number" ? Math.max(0, Math.trunc(rawOp.amount)) : 0;
          if (amount <= 0) {
            missingData.push({
              operationId: opId,
              field: "amount",
              message: `Specifica la quantità di guarigione per ${target.name}.`,
            });
          }
          operations.push({
            id: opId,
            kind: "heal",
            targetId: target.id,
            targetName: target.name,
            amount,
          });
        } else if (kind === "set_exact_hp") {
          const target = combatantsById.get(String(rawOp.targetId || ""));
          if (!target) {
            unresolvedTargets.push({
              query: String(rawOp.targetName || rawOp.targetId || "bersaglio sconosciuto"),
              reason: "not_found",
            });
            continue;
          }
          const exactHp = typeof rawOp.exactHp === "number" ? Math.max(0, Math.trunc(rawOp.exactHp)) : -1;
          if (exactHp < 0) {
            missingData.push({
              operationId: opId,
              field: "exactHp",
              message: `Specifica il valore esatto dei PF per ${target.name}.`,
            });
          }
          operations.push({
            id: opId,
            kind: "set_exact_hp",
            targetId: target.id,
            targetName: target.name,
            exactHp: Math.max(0, exactHp),
          });
        } else if (kind === "add_effect") {
          const target = combatantsById.get(String(rawOp.targetId || ""));
          if (!target) {
            unresolvedTargets.push({
              query: String(rawOp.targetName || rawOp.targetId || "bersaglio sconosciuto"),
              reason: "not_found",
            });
            continue;
          }
          const statusId = String(rawOp.statusId || "").trim() || "custom:stato";
          const def = getCombatStatusDefinition(statusId);
          const label = String(rawOp.label || def?.label || statusId.replace(/^custom:/, "")).trim();
          const linkToConcentration = Boolean(rawOp.linkToConcentration || def?.requiresConcentration);
          operations.push({
            id: opId,
            kind: "add_effect",
            targetId: target.id,
            targetName: target.name,
            statusId,
            label,
            sourceCasterId: rawOp.sourceCasterId ? String(rawOp.sourceCasterId) : undefined,
            sourceName: rawOp.sourceName ? String(rawOp.sourceName) : undefined,
            linkToConcentration,
            durationTurns: typeof rawOp.durationTurns === "number" ? rawOp.durationTurns : null,
            ...(typeof rawOp.spellName === "string" ? { spellName: rawOp.spellName.trim() } : {}),
          });
          if (linkToConcentration && !rawOp.sourceCasterId) {
            missingData.push({ operationId: opId, field: "sourceCasterId", message: `Seleziona il caster della concentrazione per ${label} su ${target.name}, oppure scegli di applicarla senza collegamento.` });
          }
          if (linkToConcentration && !rawOp.spellName) {
            missingData.push({ operationId: opId, field: "spellName", message: `Specifica il nome dell'incantesimo collegato a ${label}.` });
          }
        } else if (kind === "remove_effect") {
          const target = combatantsById.get(String(rawOp.targetId || ""));
          if (!target) {
            unresolvedTargets.push({
              query: String(rawOp.targetName || rawOp.targetId || "bersaglio sconosciuto"),
              reason: "not_found",
            });
            continue;
          }
          operations.push({
            id: opId,
            kind: "remove_effect",
            targetId: target.id,
            targetName: target.name,
            statusId: rawOp.statusId ? String(rawOp.statusId) : undefined,
            effectId: rawOp.effectId ? String(rawOp.effectId) : undefined,
          });
        } else if (kind === "start_concentration") {
          const caster = combatantsById.get(String(rawOp.casterId || ""));
          if (!caster) {
            unresolvedTargets.push({
              query: String(rawOp.casterName || rawOp.casterId || "incantatore sconosciuto"),
              reason: "not_found",
              intent: { kind: "start_concentration", spellName: typeof rawOp.spellName === "string" ? rawOp.spellName : undefined, linkedStatusId: typeof rawOp.linkedStatusId === "string" ? rawOp.linkedStatusId : undefined },
            });
            continue;
          }
          const spellName = String(rawOp.spellName || "").trim();
          if (!spellName) {
            missingData.push({
              operationId: opId,
              field: "spellName",
              message: `Specifica il nome dell'incantesimo per la concentrazione di ${caster.name}.`,
            });
          }
          const targetIds = Array.isArray(rawOp.targetIds)
            ? rawOp.targetIds.filter((id: unknown) => typeof id === "string" && combatantsById.has(id))
            : undefined;

          operations.push({
            id: opId,
            kind: "start_concentration",
            casterId: caster.id,
            casterName: caster.name,
            spellName: spellName || "Concentrazione",
            targetIds,
            linkedStatusId: rawOp.linkedStatusId ? String(rawOp.linkedStatusId) : undefined,
          });
        } else if (kind === "break_concentration") {
          const caster = combatantsById.get(String(rawOp.casterId || ""));
          if (!caster) {
            unresolvedTargets.push({
              query: String(rawOp.casterName || rawOp.casterId || "incantatore sconosciuto"),
              reason: "not_found",
              intent: { kind: "break_concentration" },
            });
            continue;
          }
          operations.push({
            id: opId,
            kind: "break_concentration",
            casterId: caster.id,
            casterName: caster.name,
          });
        }
      }
    }

    const proposal: CombatCommandProposal = {
      proposalId: `prop-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      source: "ai",
      rawInput,
      stateSignatureAtCreation: input.stateSignatureAtCreation,
      operations,
      unresolvedTargets,
      missingData,
      explanation: validated.explanation,
    };

    return { success: true, proposal };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Errore durante l'interpretazione IA con OpenRouter: ${message}`,
    };
  }
}
