import {
  COMBAT_STATUS_CATALOG,
  getCombatStatusDefinition,
  slugifyCustomStatus,
} from "@/lib/combat-conditions";
import type {
  CombatCommandOperation,
  CombatCommandProposal,
  CombatCommandUnresolvedTarget,
  CombatCommandMissingData,
} from "./types";

export type SimpleCombatantRef = {
  id: string;
  name: string;
  type?: "pc" | "monster" | "custom";
};

type TargetResolutionResult =
  | { status: "resolved"; targets: SimpleCombatantRef[] }
  | { status: "ambiguous"; query: string; candidates: SimpleCombatantRef[] }
  | { status: "not_found"; query: string };

function cleanText(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Risolve i combattenti da una stringa bersaglio.
 * Supporta:
 * - Selezioni collettive: "tutti", "tutti i mostri", "tutti i pg", "tutti i goblin"
 * - Ricerca esatta per ID
 * - Ricerca esatta o per prefisso/sottostringa per nome
 * - Se ci sono corrispondenze multiple senza intenzione collettiva ("Goblin" con Goblin 1 e Goblin 2),
 *   restituisce status: "ambiguous" con i candidati (Consegna 3 - Vincolo 3).
 */
export function resolveTargetCombatants(
  rawQuery: string,
  combatants: SimpleCombatantRef[]
): TargetResolutionResult {
  const query = cleanText(rawQuery);
  if (!query) return { status: "not_found", query: rawQuery };

  // 1. Selezioni collettive esplicite
  if (query === "tutti" || query === "tutti i combattenti" || query === "tutti i bersagli" || query === "all") {
    return { status: "resolved", targets: combatants };
  }

  if (query === "tutti i mostri" || query === "i mostri" || query === "nemici" || query === "tutti i nemici") {
    const monsters = combatants.filter((c) => c.type === "monster" || c.type === "custom");
    if (monsters.length > 0) return { status: "resolved", targets: monsters };
    return { status: "not_found", query: rawQuery };
  }

  if (
    query === "tutti i pg" ||
    query === "i pg" ||
    query === "tutti i personaggi" ||
    query === "i giocatori" ||
    query === "alleati" ||
    query === "party"
  ) {
    const pcs = combatants.filter((c) => c.type === "pc");
    if (pcs.length > 0) return { status: "resolved", targets: pcs };
    return { status: "not_found", query: rawQuery };
  }

  const collectiveMatch = query.match(/^(?:tutti\s+(?:i|gli|le)|tutte\s+le)\s+(.+)$/i);
  if (collectiveMatch) {
    const groupName = cleanText(collectiveMatch[1]);
    const matched = combatants.filter((c) => {
      const cName = cleanText(c.name);
      return cName.includes(groupName) || groupName.includes(cName);
    });
    if (matched.length > 0) return { status: "resolved", targets: matched };
    return { status: "not_found", query: rawQuery };
  }

  // 2. Corrispondenza esatta per ID
  const byId = combatants.find((c) => c.id === rawQuery.trim());
  if (byId) return { status: "resolved", targets: [byId] };

  // 3. Corrispondenza esatta per Nome (case-insensitive)
  const exactNames = combatants.filter((c) => cleanText(c.name) === query);
  if (exactNames.length === 1) {
    return { status: "resolved", targets: [exactNames[0]] };
  }
  if (exactNames.length > 1) {
    return { status: "ambiguous", query: rawQuery, candidates: exactNames };
  }

  // 4. Corrispondenza parziale (prefisso o parola)
  const partials = combatants.filter((c) => {
    const cName = cleanText(c.name);
    return cName.startsWith(query) || cName.includes(` ${query}`) || cName.includes(query);
  });

  if (partials.length === 1) {
    return { status: "resolved", targets: [partials[0]] };
  }
  if (partials.length > 1) {
    return { status: "ambiguous", query: rawQuery, candidates: partials };
  }

  return { status: "not_found", query: rawQuery };
}

let proposalCounter = 1;

function makeOpId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Parser locale deterministico per comandi in linguaggio naturale italiano.
 * Copre comandi semplici e composti (danno, cura, rettifica PF, condizioni, concentrazione).
 */
export function parseLocalCombatCommand(
  rawInput: string,
  combatants: SimpleCombatantRef[],
  stateSignatureAtCreation: string
): CombatCommandProposal {
  const proposalId = `prop-${Date.now()}-${proposalCounter++}`;
  const operations: CombatCommandOperation[] = [];
  const unresolvedTargets: CombatCommandUnresolvedTarget[] = [];
  const missingData: CombatCommandMissingData[] = [];

  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return {
      proposalId,
      source: "local",
      rawInput,
      stateSignatureAtCreation,
      operations: [],
      unresolvedTargets: [],
      missingData: [],
      explanation: "Nessun comando inserito.",
    };
  }

  // Suddividi in eventuali sotto-comandi composti (separati da ';' o ' e poi ')
  const subCommands = trimmedInput
    .split(/\s*;\s*|\s+e\s+poi\s+|\s+ed\s+anche\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sub of subCommands) {
    // -------------------------------------------------------------------------
    // 1. RETTIFICA ESATTA PF (set_exact_hp)
    // es: "imposta PF di Goblin 1 a 0", "porta Valeros a 15 pf", "PF Kyra = 20"
    // -------------------------------------------------------------------------
    const setHpMatch = sub.match(
      /^(?:imposta|setta|porta)\s*(?:i\s*)?(?:pf|punti\s*ferita|hp)\s*(?:di\s*)?(.+?)\s*(?:a|=)\s*(\d+)$/i
    ) || sub.match(/^(?:pf|hp)\s*(?:di\s*)?(.+?)\s*(?:a|=)\s*(\d+)$/i)
      || sub.match(/^porta\s+(.+?)\s+a\s+(\d+)\s*(?:pf|hp|punti\s*ferita)?$/i);

    if (setHpMatch) {
      const targetQuery = setHpMatch[1].trim();
      const exactHp = parseInt(setHpMatch[2], 10);
      const res = resolveTargetCombatants(targetQuery, combatants);

      if (res.status === "resolved") {
        for (const t of res.targets) {
          operations.push({
            id: makeOpId(),
            kind: "set_exact_hp",
            targetId: t.id,
            targetName: t.name,
            exactHp,
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: targetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
          intent: { kind: "set_exact_hp", exactHp },
        });
      } else {
        unresolvedTargets.push({ query: targetQuery, reason: "not_found", intent: { kind: "set_exact_hp", exactHp } });
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 2. CURA (heal)
    // es: "cura 10 a Valeros", "10 cure a Kyra", "+6 a Kyra", "guarisci Valeros di 8"
    // -------------------------------------------------------------------------
    const healMatch = sub.match(
      /^(?:cura|guarisci|aggiungi\s*pf)\s*(?:di\s*)?(\d+)\s*(?:pf|punti\s*ferita|hp)?\s*(?:a|su)?\s*(.+)$/i
    ) || sub.match(/^(\d+)\s*(?:cure|cura|pf\s*curati)\s*(?:a|su)?\s*(.+)$/i)
      || sub.match(/^(?:\+|\bpiù\b)\s*(\d+)\s*(?:pf|hp)?\s*(?:a|su)?\s*(.+)$/i)
      || sub.match(/^guarisci\s+(.+?)\s+di\s+(\d+)\s*(?:pf|hp)?$/i);

    if (healMatch) {
      // In base al pattern, il numero può essere nel gruppo 1 o 2
      const isReversed = !isNaN(parseInt(healMatch[2], 10)) && isNaN(parseInt(healMatch[1], 10));
      const amount = isReversed ? parseInt(healMatch[2], 10) : parseInt(healMatch[1], 10);
      const targetQuery = (isReversed ? healMatch[1] : healMatch[2]).trim();

      const res = resolveTargetCombatants(targetQuery, combatants);
      if (res.status === "resolved") {
        for (const t of res.targets) {
          operations.push({
            id: makeOpId(),
            kind: "heal",
            targetId: t.id,
            targetName: t.name,
            amount,
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: targetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
          intent: { kind: "heal", amount },
        });
      } else {
        unresolvedTargets.push({ query: targetQuery, reason: "not_found", intent: { kind: "heal", amount } });
      }
      continue;
    }

    const healMissingAmountMatch =
      sub.match(/^(?:cura|guarisci)\s*(?:a|su)\s*(.+)$/i);

    if (healMissingAmountMatch) {
      const targetQuery = healMissingAmountMatch[1].trim();
      const res = resolveTargetCombatants(targetQuery, combatants);
      if (res.status === "resolved") {
        for (const t of res.targets) {
          const opId = makeOpId();
          operations.push({
            id: opId,
            kind: "heal",
            targetId: t.id,
            targetName: t.name,
            amount: 0,
          });
          missingData.push({
            operationId: opId,
            field: "amount",
            message: `Specifica la quantità di guarigione per ${t.name}.`,
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: targetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
          intent: { kind: "heal", amount: null },
        });
      } else {
        unresolvedTargets.push({ query: targetQuery, reason: "not_found", intent: { kind: "heal", amount: null } });
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 3. DANNO (damage)
    // es: "12 danni a Valeros", "infliggi 8 a Goblin 1 da fuoco", "Valeros subisce 10 danni"
    // -------------------------------------------------------------------------
    const damageMatch = sub.match(
      /^(\d+)\s*(?:danni|danno)\s*(?:a|su|contro)?\s*(.+?)(?:\s+da\s+(.+))?$/i
    ) || sub.match(/^infliggi\s*(\d+)\s*(?:danni|danno)?\s*(?:a|su)?\s*(.+?)(?:\s+da\s+(.+))?$/i)
      || sub.match(/^(.+?)\s*(?:subisce|prende)\s*(\d+)\s*(?:danni|danno)?(?:\s+da\s+(.+))?$/i)
      || sub.match(/^(?:-|\bmeno\b)\s*(\d+)\s*(?:pf|hp)?\s*(?:a|su)?\s*(.+)$/i);

    if (damageMatch) {
      const isTargetFirst = isNaN(parseInt(damageMatch[1], 10)) && !isNaN(parseInt(damageMatch[2], 10));
      const amount = isTargetFirst ? parseInt(damageMatch[2], 10) : parseInt(damageMatch[1], 10);
      const targetQuery = (isTargetFirst ? damageMatch[1] : damageMatch[2]).trim();
      const sourceLabel = (isTargetFirst ? damageMatch[3] : damageMatch[3])?.trim();

      const res = resolveTargetCombatants(targetQuery, combatants);
      if (res.status === "resolved") {
        for (const t of res.targets) {
          operations.push({
            id: makeOpId(),
            kind: "damage",
            targetId: t.id,
            targetName: t.name,
            amount,
            ...(sourceLabel ? { sourceLabel } : {}),
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: targetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
          intent: { kind: "damage", amount, ...(sourceLabel ? { sourceLabel } : {}) },
        });
      } else {
        unresolvedTargets.push({ query: targetQuery, reason: "not_found", intent: { kind: "damage", amount, ...(sourceLabel ? { sourceLabel } : {}) } });
      }
      continue;
    }

    const damageMissingAmountMatch =
      sub.match(/^(?:infliggi\s+)?danno\s*(?:a|su|contro)\s*(.+)$/i) ||
      sub.match(/^(.+?)\s*(?:subisce|prende)\s+danno$/i);

    if (damageMissingAmountMatch) {
      const targetQuery = damageMissingAmountMatch[1].trim();
      const res = resolveTargetCombatants(targetQuery, combatants);
      if (res.status === "resolved") {
        for (const t of res.targets) {
          const opId = makeOpId();
          operations.push({
            id: opId,
            kind: "damage",
            targetId: t.id,
            targetName: t.name,
            amount: 0,
          });
          missingData.push({
            operationId: opId,
            field: "amount",
            message: `Specifica la quantità di danno per ${t.name}.`,
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: targetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
          intent: { kind: "damage", amount: null },
        });
      } else {
        unresolvedTargets.push({ query: targetQuery, reason: "not_found", intent: { kind: "damage", amount: null } });
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 4. INTERRUZIONE CONCENTRAZIONE (break_concentration)
    // es: "interrompi concentrazione di Kyra", "Valeros perde la concentrazione"
    // -------------------------------------------------------------------------
    const breakConcMatch = sub.match(
      /^(?:interrompi|spezza|termina|stop|chiudi)\s*(?:la\s*)?concentrazione\s*(?:di|su)?\s*(.+)$/i
    ) || sub.match(/^(.+?)\s*(?:perde|interrompe)\s*(?:la\s*)?concentrazione$/i);

    if (breakConcMatch) {
      const casterQuery = breakConcMatch[1].trim();
      const res = resolveTargetCombatants(casterQuery, combatants);
      if (res.status === "resolved") {
        for (const c of res.targets) {
          operations.push({
            id: makeOpId(),
            kind: "break_concentration",
            casterId: c.id,
            casterName: c.name,
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: casterQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
        });
      } else {
        unresolvedTargets.push({ query: casterQuery, reason: "not_found" });
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 5. AVVIO CONCENTRAZIONE (start_concentration)
    // es: "Kyra si concentra su Benedizione", "concentrazione Guardiani Spirituali su Kyra"
    // -------------------------------------------------------------------------
    const startConcMatch = sub.match(
      /^(.+?)\s*(?:si concentra su|inizia concentrazione su|avvia concentrazione su)\s*(.+)$/i
    ) || sub.match(/^concentrazione\s+(.+?)\s+(?:su|per|da parte di)\s+(.+)$/i);

    if (startConcMatch) {
      const isCasterFirst = sub.includes("si concentra su") || sub.includes("inizia") || sub.includes("avvia");
      const casterQuery = (isCasterFirst ? startConcMatch[1] : startConcMatch[2]).trim();
      const spellName = (isCasterFirst ? startConcMatch[2] : startConcMatch[1]).trim();

      const res = resolveTargetCombatants(casterQuery, combatants);
      if (res.status === "resolved") {
        const caster = res.targets[0];
        // Cerca se esiste uno stato collegato nel catalogo con questo nome incantesimo
        const statusSlug = slugifyCustomStatus(spellName);
        const catalogStatus = getCombatStatusDefinition(statusSlug);

        operations.push({
          id: makeOpId(),
          kind: "start_concentration",
          casterId: caster.id,
          casterName: caster.name,
          spellName,
          ...(catalogStatus ? { linkedStatusId: catalogStatus.id } : {}),
        });
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: casterQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
        });
      } else {
        unresolvedTargets.push({ query: casterQuery, reason: "not_found" });
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 6. RIMOZIONE CONDIZIONE / STATO (remove_effect)
    // es: "rimuovi avvelenato da Valeros", "togli prono da Goblin 1", "cura veleno su Kyra"
    // -------------------------------------------------------------------------
    const removeEffectMatch = sub.match(
      /^(?:rimuovi|togli|elimina|cancella)\s*(?:la\s*condizione\s*)?([A-Za-zÀ-ÿ\s'-]+?)\s*(?:da|su|a)\s*(.+)$/i
    ) || sub.match(/^cura\s+([A-Za-zÀ-ÿ\s'-]+?)\s+(?:su|a|da)\s+(.+)$/i);

    if (removeEffectMatch) {
      const rawStatus = removeEffectMatch[1].trim();
      const targetQuery = removeEffectMatch[2].trim();
      const statusSlug = slugifyCustomStatus(rawStatus);
      const def = getCombatStatusDefinition(statusSlug) || getCombatStatusDefinition(rawStatus.toLowerCase());

      const res = resolveTargetCombatants(targetQuery, combatants);
      if (res.status === "resolved") {
        for (const t of res.targets) {
          operations.push({
            id: makeOpId(),
            kind: "remove_effect",
            targetId: t.id,
            targetName: t.name,
            statusId: def ? def.id : statusSlug,
          });
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: targetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
        });
      } else {
        unresolvedTargets.push({ query: targetQuery, reason: "not_found" });
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // 7. AGGIUNTA CONDIZIONE / BUFF (add_effect)
    // es: "applica prono a Valeros", "avvelena Goblin 1", "benedizione a Kyra"
    // -------------------------------------------------------------------------
    let addStatusName: string | null = null;
    let addTargetQuery: string | null = null;

    const verbMatch = sub.match(/^(avvelena|acceca|paralizza|stordisci|atterra|affascina)\s+(.+)$/i);
    if (verbMatch) {
      const verb = verbMatch[1].toLowerCase();
      addTargetQuery = verbMatch[2].trim();
      if (verb === "avvelena") addStatusName = "avvelenato";
      else if (verb === "acceca") addStatusName = "accecato";
      else if (verb === "paralizza") addStatusName = "paralizzato";
      else if (verb === "stordisci") addStatusName = "stordito";
      else if (verb === "atterra") addStatusName = "prono";
      else if (verb === "affascina") addStatusName = "affascinato";
    } else {
      const explicitAddMatch = sub.match(
        /^(?:applica|aggiungi|metti|infliggi)\s*(?:la\s*condizione\s*)?([A-Za-zÀ-ÿ\s'-]+?)\s*(?:a|su)\s*(.+)$/i
      );
      if (explicitAddMatch) {
        addStatusName = explicitAddMatch[1].trim();
        addTargetQuery = explicitAddMatch[2].trim();
      }
    }

    if (addStatusName && addTargetQuery) {
      const statusSlug = slugifyCustomStatus(addStatusName);
      const def = getCombatStatusDefinition(statusSlug) || getCombatStatusDefinition(addStatusName.toLowerCase());
      const statusId = def ? def.id : statusSlug;
      const label = def ? def.label : addStatusName;

      const res = resolveTargetCombatants(addTargetQuery, combatants);
      if (res.status === "resolved") {
        for (const t of res.targets) {
          const opId = makeOpId();
          operations.push({
            id: opId,
            kind: "add_effect",
            targetId: t.id,
            targetName: t.name,
            statusId,
            label,
            ...(def?.requiresConcentration ? { spellName: addStatusName, linkToConcentration: true } : {}),
            durationTurns: def?.defaultDurationTurns ?? null,
          });
          if (def?.requiresConcentration) {
            missingData.push({ operationId: opId, field: "sourceCasterId", message: `Seleziona il caster della concentrazione per ${addStatusName} su ${t.name}, oppure scegli di applicarla senza collegamento.` });
          }
        }
      } else if (res.status === "ambiguous") {
        unresolvedTargets.push({
          query: addTargetQuery,
          reason: "ambiguous",
          candidates: res.candidates.map((c) => ({ id: c.id, name: c.name })),
          intent: { kind: "add_effect", statusId, label, ...(def?.requiresConcentration ? { linkToConcentration: true, spellName: addStatusName } : {}), durationTurns: def?.defaultDurationTurns ?? null },
        });
      } else {
        unresolvedTargets.push({ query: addTargetQuery, reason: "not_found", intent: { kind: "add_effect", statusId, label, ...(def?.requiresConcentration ? { linkToConcentration: true, spellName: addStatusName } : {}), durationTurns: def?.defaultDurationTurns ?? null } });
      }
      continue;
    }

    // Se non ha matchato alcun pattern, segnaliamo mancata interpretazione locale
    // così la UI può suggerire di invocare l'IA
    missingData.push({
      operationId: makeOpId(),
      field: "command_syntax",
      message: `Comando non riconosciuto dal parser locale: "${sub}". Puoi richiedere l'interpretazione IA.`,
    });
  }

  return {
    proposalId,
    source: "local",
    rawInput,
    stateSignatureAtCreation,
    operations,
    unresolvedTargets,
    missingData,
    explanation:
      operations.length > 0
        ? `Interpretate ${operations.length} operazioni con parser locale.`
        : "Nessuna operazione valida riconosciuta dal parser locale.",
  };
}
