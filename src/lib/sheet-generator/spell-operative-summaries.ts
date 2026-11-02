/**
 * Catalogo condiviso di sintesi operative verificate degli incantesimi.
 *
 * Collegato ai manuali locali (`manuale_giocatore.md`, `xanathar.md`, `Tasha.md`).
 * Conserva tutti i metadati e le regole di gioco necessarie:
 * - Tempo di lancio e innesco reazione (se presente)
 * - Gittata, area e bersagli
 * - Durata, concentrazione e rituale
 * - Componenti (V, S, M con indicazione di costi in mo o consumo)
 * - Tiro per colpire o Tiro Salvezza (con conseguenze successo/fallimento)
 * - Danni, cure, condizioni, limiti ed eccezioni determinanti
 * - Potenziamento con slot superiori e scaling trucchetti
 *
 * Nessuna chiamata AI a runtime e nessun fallback automatico che tronchi il testo
 * del manuale o assegni valori predefiniti inventati (`1 azione`, `Contatto`,
 * `Istantanea`, `V, S`). Se un incantesimo è privo di sintesi verificata o di
 * metadati essenziali, la validazione pre-stampa solleva un errore esplicito.
 */

import spellCatalogJson from './spell-operative-catalog.json';

export interface SpellOperativeSummary {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  components: string;
  costlyMaterial?: string;
  saveOrAttack?: string;
  effectSummary: string;
  higherLevels?: string;
}

export const VERIFIED_SPELL_SUMMARIES: Record<string, SpellOperativeSummary> =
  spellCatalogJson as Record<string, SpellOperativeSummary>;

export function normalizeSpellLookupKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘']/g, "'")
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SPELL_LOOKUP_ALIASES: Record<string, string> = {
  'lenza elettrzante': 'lenza elettrizzante',
  'socno del velo celeste': 'sogno del velo celeste',
  'evolare bestia': 'evoca bestia',
  "evocabestia d'ombra": "evoca bestia d'ombra",
  'evoca elementali': 'evoca elementale',
  'risata incontrollabile di tasha': 'risata incontenibile di tasha',
  'individuazione del male e del bene': 'individuazione del bene e del male',
  'protezione dal male e dal bene': 'protezione dal bene e dal male',
  'fiamma continua': 'fiamma perenne',
  'blocco di persone': 'blocca persone',
};

const NORMALIZED_LOOKUP: Record<string, SpellOperativeSummary> = {};
for (const [key, val] of Object.entries(VERIFIED_SPELL_SUMMARIES)) {
  NORMALIZED_LOOKUP[normalizeSpellLookupKey(key)] = val;
  NORMALIZED_LOOKUP[normalizeSpellLookupKey(val.name)] = val;
}
for (const [alias, canonical] of Object.entries(SPELL_LOOKUP_ALIASES)) {
  const target = NORMALIZED_LOOKUP[normalizeSpellLookupKey(canonical)];
  if (target) {
    NORMALIZED_LOOKUP[normalizeSpellLookupKey(alias)] = target;
  }
}

export function getSpellOperativeSummary(name: string): SpellOperativeSummary | null {
  const norm = normalizeSpellLookupKey(name);
  return NORMALIZED_LOOKUP[norm] ?? null;
}

export interface CompactSpellValidationIssue {
  spellName: string;
  reason: string;
}

/**
 * Verifica che tutti gli incantesimi della scheda abbiano una sintesi operativa
 * verificata e tutti i metadati essenziali completi prima della stampa compatta.
 */
export function validateSheetSpellsForCompactPrint(
  spells: ReadonlyArray<{ name: string; level?: number }>
): CompactSpellValidationIssue[] {
  const issues: CompactSpellValidationIssue[] = [];
  for (const sp of spells) {
    const rawName = (sp.name ?? '').trim();
    if (!rawName) {
      issues.push({ spellName: '(senza nome)', reason: "Nome dell'incantesimo mancante." });
      continue;
    }
    const summary = getSpellOperativeSummary(rawName);
    if (!summary) {
      issues.push({
        spellName: rawName,
        reason: `Sintesi operativa verificata mancante nel catalogo per «${rawName}».`,
      });
      continue;
    }
    const requiredFields: Array<[keyof SpellOperativeSummary, string]> = [
      ['school', 'scuola di magia'],
      ['castingTime', 'tempo di lancio'],
      ['range', 'gittata'],
      ['duration', 'durata'],
      ['components', 'componenti'],
      ['effectSummary', 'sintesi operativa degli effetti'],
    ];
    for (const [field, label] of requiredFields) {
      const val = summary[field];
      if (typeof val !== 'string' || !val.trim()) {
        issues.push({
          spellName: rawName,
          reason: `Metadato essenziale mancante (${label}) nella sintesi di «${rawName}».`,
        });
      }
    }
  }
  return issues;
}

export function assertSheetSpellsVerifiedForPrint(
  spells: ReadonlyArray<{ name: string; level?: number }>
): void {
  const issues = validateSheetSpellsForCompactPrint(spells);
  if (issues.length > 0) {
    const details = issues.map((i) => `${i.spellName}: ${i.reason}`).join(' | ');
    throw new Error(`Impossibile stampare la scheda compatta: ${details}`);
  }
}
