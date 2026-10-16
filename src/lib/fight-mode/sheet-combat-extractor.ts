import {
  COMBAT_STATUS_CATALOG,
} from "@/lib/combat-conditions";
import type {
  MonsterActionSuggestion,
  SavingThrowsMap,
  StructuredPcCombatData,
  StructuredPcSpell,
  StructuredPcWeapon,
} from "@/lib/fight-mode/types";
import { getDefaultPcWeapons } from "@/lib/fight-mode/stats-helper";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseSnapshotObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(raw) ? raw : null;
}

/**
 * Estrae i dati di combattimento strutturati dalla scheda PG (rules_snapshot.character_sheet).
 *
 * VINCOLI RIGOROSI (Consegna 2 - Vincolo 6):
 * - Legge le armi da character_sheet.weaponRows. Usa il fallback di classe solo se manca l'intera scheda.
 * - Legge CD e bonus incantesimi da character_sheet.spellSaveDc e spellAttackBonus.
 * - Legge gli incantesimi ESCLUSIVAMENTE da character_sheet.spells (oggetti strutturati).
 * - IGNORA TOTALMENTE rules_snapshot.spellsListMd (che contiene l'intero compendio della classe e non gli incantesimi scelti dal PG).
 * - Non assume che un incantesimo sia preparato o utilizzabile: include sempre il disclaimer esplicito per il GM.
 */
export function extractStructuredPcCombatData(
  rulesSnapshot: unknown,
  characterClass?: string | null,
  level: number = 1
): StructuredPcCombatData {
  const disclaimer =
    "Gli incantesimi in scheda rappresentano la lista conosciuta o a disposizione del personaggio, non necessariamente preparata o attiva per la giornata di gioco. Verifica sempre con il giocatore.";

  const root = parseSnapshotObject(rulesSnapshot);
  const sheet = isRecord(root?.character_sheet) ? root.character_sheet : null;

  if (!sheet) {
    const fallbackWeapons = getDefaultPcWeapons(characterClass);
    return {
      weapons: fallbackWeapons,
      spellSaveDc: null,
      spellAttackBonus: null,
      spells: [],
      hasSpells: false,
      source: fallbackWeapons.length > 0 ? "fallback" : "empty",
      disclaimer,
    };
  }

  // 1. Armi da character_sheet.weaponRows
  let weapons: StructuredPcWeapon[] = [];
  if (Array.isArray(sheet.weaponRows) && sheet.weaponRows.length > 0) {
    for (const w of sheet.weaponRows) {
      if (isRecord(w)) {
        const name =
          typeof w.name === "string" && w.name.trim()
            ? w.name.trim()
            : typeof w.weapon === "string" && w.weapon.trim()
            ? w.weapon.trim()
            : "";
        if (name) {
          weapons.push({
            name,
            toHit: typeof w.toHit === "string" && w.toHit.trim() ? w.toHit.trim() : null,
            damage: typeof w.damage === "string" && w.damage.trim() ? w.damage.trim() : null,
            type:
              typeof w.type === "string" && w.type.trim()
                ? w.type.trim()
                : typeof w.damageType === "string" && w.damageType.trim()
                ? w.damageType.trim()
                : null,
          });
        }
      }
    }
  }
  // 2. CD e Bonus TxC Magico
  const spellSaveDc =
    typeof sheet.spellSaveDc === "number" && Number.isFinite(sheet.spellSaveDc) && sheet.spellSaveDc > 0
      ? Math.trunc(sheet.spellSaveDc)
      : null;
  const spellAttackBonus =
    typeof sheet.spellAttackBonus === "number" && Number.isFinite(sheet.spellAttackBonus)
      ? Math.trunc(sheet.spellAttackBonus)
      : null;

  // 3. Incantesimi da character_sheet.spells (STRETTAMENTE IGNORANDO spellsListMd)
  const spells: StructuredPcSpell[] = [];
  if (Array.isArray(sheet.spells)) {
    for (const sp of sheet.spells) {
      if (isRecord(sp) && typeof sp.name === "string" && sp.name.trim()) {
        spells.push({
          name: sp.name.trim(),
          level: typeof sp.level === "number" && Number.isFinite(sp.level) ? Math.trunc(sp.level) : 0,
          concentration: Boolean(sp.concentration),
          ritual: Boolean(sp.ritual),
          summary: typeof sp.summary === "string" ? sp.summary.trim() : undefined,
        });
      }
    }
  }

  const hasSpells =
    spells.length > 0 ||
    Boolean(sheet.spellcastingClass) ||
    spellSaveDc !== null ||
    spellAttackBonus !== null;

  return {
    weapons,
    spellSaveDc,
    spellAttackBonus,
    spells,
    hasSpells,
    source: "sheet",
    disclaimer,
  };
}

const ABILITY_ALIASES: Record<string, keyof SavingThrowsMap> = {
  forza: "for",
  for: "for",
  strength: "for",
  str: "for",
  destrezza: "des",
  des: "des",
  dexterity: "des",
  dex: "des",
  costituzione: "cos",
  cos: "cos",
  constitution: "cos",
  con: "cos",
  intelligenza: "int",
  int: "int",
  intelligence: "int",
  saggezza: "sag",
  sag: "sag",
  wisdom: "sag",
  wis: "sag",
  carisma: "car",
  car: "car",
  charisma: "car",
  cha: "car",
};

/**
 * Frasi ed espressioni negative da scartare categoricamente per evitare falsi positivi
 * (es. immunità alle condizioni, vantaggi difensivi, rimozioni o cure).
 */
const NEGATIVE_OR_IMMUNITY_PATTERNS = [
  /immunit[àa]/i,
  /condition immunities/i,
  /damage immunities/i,
  /\bimmune\b/i,
  /\bimmuni\b/i,
  /non pu[òo] essere\b/i,
  /\bcannot be\b/i,
  /vantaggio (ai|alle|contro|nei) tiri salvezza\b/i,
  /\badvantage on saving throws\b/i,
  /\bcura\b/i,
  /\bcure\b/i,
  /\brimuo(ve|vendo)\b/i,
  /\bremov(es|ing)\b/i,
  /\bguarisce\b/i,
];

function isNegativeOrImmunitySentence(sentence: string): boolean {
  return NEGATIVE_OR_IMMUNITY_PATTERNS.some((pattern) => pattern.test(sentence));
}

/**
 * Mappatura parole chiave in testo -> statusId catalogo D&D 5e / GM Screen.
 */
const CONDITION_KEYWORD_MAP: Array<{ regex: RegExp; statusId: string; label: string }> = [
  { regex: /\bavvelenat[oaei]\b|\bpoisoned\b/i, statusId: "avvelenato", label: "Avvelenato" },
  { regex: /\baccecat[oaei]\b|\bblinded\b/i, statusId: "accecato", label: "Accecato" },
  { regex: /\baffascinat[oaei]\b|\bcharmed\b/i, statusId: "affascinato", label: "Affascinato" },
  { regex: /\bafferrat[oaei]\b|\bgrappled\b/i, statusId: "afferrato", label: "Afferrato" },
  { regex: /\bassordat[oaei]\b|\bdeafened\b/i, statusId: "assordato", label: "Assordato" },
  { regex: /\bincapacitat[oaei]\b|\bincapacitated\b/i, statusId: "incapacitato", label: "Incapacitato" },
  { regex: /\bparalizzat[oaei]\b|\bparalyzed\b/i, statusId: "paralizzato", label: "Paralizzato" },
  { regex: /\bpietrificat[oaei]\b|\bpetrified\b/i, statusId: "pietrificato", label: "Pietrificato" },
  { regex: /\bpron[oaei]\b|\bprone\b/i, statusId: "prono", label: "Prono" },
  { regex: /\bspaventat[oaei]\b|\bfrightened\b/i, statusId: "spaventato", label: "Spaventato" },
  { regex: /\bstordit[oaei]\b|\bstunned\b/i, statusId: "stordito", label: "Stordito" },
  { regex: /\btrattenut[oaei]\b|\brestrained\b/i, statusId: "trattenuto", label: "Trattenuto" },
  { regex: /\bindebolimento\b|\bexhaustion\b/i, statusId: "indebolimento", label: "Indebolimento" },
  { regex: /\blentezza\b|\bslow\b/i, statusId: "lentezza", label: "Lentezza" },
  { regex: /\banatema\b|\bbane\b/i, statusId: "anatema", label: "Anatema" },
  { regex: /\bsortilegio\b|\bhex\b/i, statusId: "sortilegio", label: "Sortilegio" },
  { regex: /\bmarchio del cacciatore\b|\bhunter['’]s mark\b/i, statusId: "marchio-del-cacciatore", label: "Marchio del Cacciatore" },
];

/**
 * Deduce suggerimenti di condizioni e tiri salvezza dalle azioni/capacità del mostro (Markdown).
 */
export function parseMonsterActionSuggestions(statblockText: string): MonsterActionSuggestion[] {
  if (!statblockText || typeof statblockText !== "string") return [];

  // Dividi in sezioni/paragrafi/azioni
  const paragraphs = statblockText.split(/\n\s*\n|\n(?=[*#]{1,4}\s*|\*{2,3}[^*]+\*{2,3}\.?)/);
  const suggestions: MonsterActionSuggestion[] = [];
  const seenKeys = new Set<string>();

  let idCounter = 1;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // Salta intestazioni generiche
    if (/^(?:#{1,4}\s*|\*{2,3})(?:azioni|tratti|reazioni|actions|traits|reactions)(?:\*{2,3})?$/i.test(trimmed)) {
      continue;
    }

    // Se l'intero paragrafo o riga è una dichiarazione di immunità o resistenze, scartalo categoricamente
    if (
      /^(?:\*{1,3}|#{1,4}\s*)?(?:immunit[àa]|condition immunities|damage immunities)/i.test(trimmed) ||
      /\b(?:è immune|sono immuni|immune a qualsiasi|non pu[òo] essere)\b/i.test(trimmed)
    ) {
      continue;
    }

    // Estrai il nome dell'azione (es. "**Morso**.", "***Frightful Presence***.", "**Soffio Velenoso (Ricarica 5-6)**.")
    const actionMatch = trimmed.match(
      /^(?:\*{1,3}|#{1,4}\s*)?([A-Za-z0-9À-ÿ\s'()/-]{2,60}?)(?:\*{1,3})?\.\s*([\s\S]*)$/
    );
    const actionName = actionMatch ? actionMatch[1].trim() : "Azione";
    const bodyText = actionMatch && actionMatch[2].trim() ? actionMatch[2].trim() : trimmed;

    // Isola le frasi dell'azione
    const sentences = bodyText.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ù])/);

    for (const cond of CONDITION_KEYWORD_MAP) {
      if (!cond.regex.test(bodyText)) continue;

      // Trova la frase o combinazione di frasi che descrivono l'effetto e il TS
      const sentenceWithCond = sentences.find((s) => cond.regex.test(s) && !isNegativeOrImmunitySentence(s));
      const sentenceWithDc = sentences.find((s) => /(?:CD|DC)\s*\d+/i.test(s) && !isNegativeOrImmunitySentence(s));
      let matchingSentence =
        sentenceWithCond && sentenceWithDc && sentenceWithCond !== sentenceWithDc
          ? `${sentenceWithDc} ${sentenceWithCond}`
          : sentenceWithCond ||
            (cond.regex.test(bodyText) && !isNegativeOrImmunitySentence(bodyText) ? bodyText : null);

      if (!matchingSentence) continue;

      // Estrai CD se presente (cerca prima nella frase, poi nel corpo dell'azione)
      const dcMatch = matchingSentence.match(/(?:CD|DC)\s*(\d+)/i) || bodyText.match(/(?:CD|DC)\s*(\d+)/i);
      const dc = dcMatch ? parseInt(dcMatch[1], 10) : undefined;

      // Estrai caratteristica TS se presente
      let ability: keyof SavingThrowsMap | undefined;
      const abMatch =
        matchingSentence.match(
          /(?:tiro salvezza (?:su|in)|saving throw (?:on|in)|TS su|TS)\s+(forza|costituzione|destrezza|intelligenza|saggezza|carisma|for|cos|des|int|sag|car|str|con|dex|wis|cha)/i
        ) ||
        bodyText.match(
          /(?:tiro salvezza (?:su|in)|saving throw (?:on|in)|TS su|TS)\s+(forza|costituzione|destrezza|intelligenza|saggezza|carisma|for|cos|des|int|sag|car|str|con|dex|wis|cha)/i
        );
      if (abMatch) {
        const abKey = abMatch[1].toLowerCase();
        ability = ABILITY_ALIASES[abKey];
      }

      // Solo una formulazione esplicita di TS ripetuto determina il timing.
      let timing: "turn_end" | "turn_start" | undefined;
      if (
        /(?:ripetere|ripete|repeating|repeat)\s+(?:il\s+)?(?:tiro salvezza|TS|saving throw)|(?:tiro salvezza|TS|saving throw)[^.]*\b(?:alla|al|a ogni|at the end of each|at the start of each)\b[^.]*\b(?:turno|turn|end|start)\b/i.test(bodyText) &&
        /\b(?:fine|termine) (?:di|del) (?:ciascun[oa]?|ogni|suo|propri[oa]|dei suoi|suoi turni)\b|end of each\b/i.test(bodyText)
      ) {
        timing = "turn_end";
      } else if (
        /(?:ripetere|ripete|repeating|repeat)\s+(?:il\s+)?(?:tiro salvezza|TS|saving throw)|(?:tiro salvezza|TS|saving throw)[^.]*\b(?:alla|al|a ogni|at the end of each|at the start of each)\b[^.]*\b(?:turno|turn|end|start)\b/i.test(bodyText) &&
        /\binizio (?:di|del) (?:ciascun[oa]?|ogni|suo|propri[oa]|dei suoi|suoi turni)\b|start of each\b/i.test(bodyText)
      ) {
        timing = "turn_start";
      }

      // Durata standard
      let durationTurns: number | undefined;
      if (/\b1 minuto\b|\b1 minute\b/i.test(bodyText)) {
        durationTurns = 10;
      } else if (/\b1 round\b/i.test(bodyText)) {
        durationTurns = 1;
      }

      const dedupKey = `${actionName}:${cond.statusId}:${dc ?? 0}`;
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);

      suggestions.push({
        id: `sugg-${idCounter++}`,
        actionName,
        originalSentence: matchingSentence.trim(),
        statusId: cond.statusId,
        label: cond.label,
        ...(dc !== undefined ? { dc } : {}),
        ...(ability !== undefined ? { ability } : {}),
        ...(dc !== undefined ? { initialSaveDc: dc } : {}),
        ...(ability !== undefined ? { initialSaveAbility: ability } : {}),
        ...(timing ? { timing } : {}),
        ...(timing ? { onPass: "remove_effect" } : {}),
        ...(durationTurns !== undefined ? { durationTurns } : {}),
        requiresConcentration: false,
      });
    }
  }

  return suggestions;
}
