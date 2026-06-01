import { getSpellCombatTierScore, normalizeSpellNameForTier } from "@/lib/sheet-generator/spell-combat-tier";

/** Incantesimi utili fuori combattimo: esclusi in modalità torneo. */
const TORNEO_NON_COMBAT = new Set(
  [
    "Zona di Verità",
    "Individuazione del Magico",
    "Individuazione",
    "Parlare con i Morti",
    "Chiaroveggenza",
    "Sfera di Cristallo",
    "Scrutare",
    "Anticipare",
    "Vincolo di Interdizione",
    "Presagio",
    "Guida",
    "Allarme",
    "Trova Famiglio",
    "Servitore Inosservato",
    "Messaggio",
    "Amicizia",
    "Prestidigitazione",
    "Illusione Minore",
    "Comprensione dei Linguaggi",
    "Rileva Magia",
    "Rileva Veleno e Malattia",
    "Individuazione del Bene e del Male",
    "Individuazione del Male e del Bene",
    "Localizza Animale o Pianta",
    "Localizza Oggetto",
    "Localizza Creatura",
    "Comunicare con Animali",
    "Comunicare con Piante",
    "Luce",
    "Luce diurna",
    "Luce Diurna",
    "Mano del Mago",
    "Ritirata Rapida",
    "Vita Falsata",
    "Alterare Se Stesso",
    "Ingrandire/Ridurre",
    "Caratteristica Potenziata",
    "Levitazione",
    "Passare senza Traccia",
    "Silenzio",
    "Tongue dei Morti",
    "Lingua del Sole e della Luna",
    "Suggestion",
    "Suggestione",
    "Charme su Persone",
    "Invisibilità",
    "Invisibilità Superiore",
    "Morte Apparente",
    "Teletrasporto",
    "Buco Portatile",
    "Portale Dimensionale",
    "Forma Eterea",
    "Forma Gassosa",
    "Volare",
    "Cacciare Memorie",
    "Inviare",
    "Scrutare",
    "Veggenza",
    "Divinazione",
    "Contatto Extradimensionale",
    "Ristorare Superiore",
    "Ristorare Inferiore",
    "Identificare",
    "Leggere Lingue",
    "Comprendere Lingue",
    "Scassinare",
  ].map(normalizeSpellNameForTier)
);

/** Tier 80 misti: solo questi restano ammessi in torneo. */
const TORNEO_TIER_80_COMBAT_OK = new Set(
  [
    "Cecità/Sordità",
    "Ragnatela",
    "Patata Bollente",
    "Corona di Follia",
    "Mente da Comandante",
    "Colpo Occulto",
    "Anatema",
    "Infliggi Ferite",
    "Santuario",
    "Interdizione alle Lame",
    "Glifo di Interdizione",
  ].map(normalizeSpellNameForTier)
);

const NON_COMBAT_NAME_RE =
  /\b(individuazione|chiaroveggenza|scrutare|divinazione|verita|anticipare|presagio|guida|allarme|famiglio|inosservato|messaggio|amicizia|prestidigitar|comprensione|localizza|comunicare|teletrasporto|portale|buco portatile|invisibil|morte apparente|forma eter|forma gass|volare|leggere lingue|identificare|ristorare|invio|inviare|cacciare memorie|luce diurna)\b/i;

/** Nomi PHB con varianti di traduzione, utili in combattimento ma fuori dalla tier list. */
const TORNEO_COMBAT_EXTRA = new Set(
  [
    "Protezione dal Male e del Bene",
    "Protezione dal Bene e dal Male",
    "Favore Divino",
    "Marchio del Cacciatore",
    "Colpo Infuocato",
  ].map(normalizeSpellNameForTier)
);

/** Incantesimi paladino «Punizione …» (colpi fulminanti). */
export function isPaladinPunishmentSpell(spellName: string): boolean {
  return normalizeSpellNameForTier(spellName).includes("punizione");
}

/** Escluso esplicitamente in torneo (anche se ha tier list alta). */
export function isTorneoHardBlockedSpell(spellName: string): boolean {
  return TORNEO_NON_COMBAT.has(normalizeSpellNameForTier(spellName));
}

/** True se l'incantesimo è adatto a un combattimento in torneo. */
export function isTorneoCombatSpell(spellName: string): boolean {
  const key = normalizeSpellNameForTier(spellName);
  if (TORNEO_NON_COMBAT.has(key)) return false;
  if (NON_COMBAT_NAME_RE.test(spellName)) return false;
  if (isPaladinPunishmentSpell(spellName)) return true;
  if (TORNEO_COMBAT_EXTRA.has(key)) return true;

  const score = getSpellCombatTierScore(spellName);
  if (score >= 72) return true;
  if (score === 80) return TORNEO_TIER_80_COMBAT_OK.has(key);

  return false;
}

export function filterTorneoCombatSpells<T extends { name: string }>(entries: T[]): T[] {
  return entries.filter((e) => isTorneoCombatSpell(e.name));
}

export type SpellPickEntry = { name: string; level: number };

/** Garantisce almeno un incantesimo «Punizione …» per il paladino. */
export function ensurePaladinPunishmentSpell(
  picked: SpellPickEntry[],
  pool: SpellPickEntry[],
  maxLevel: number
): SpellPickEntry[] {
  if (picked.some((e) => isPaladinPunishmentSpell(e.name))) return picked;

  const punishments = pool
    .filter((e) => e.level >= 1 && e.level <= maxLevel && isPaladinPunishmentSpell(e.name))
    .sort((a, b) => b.level - a.level);
  if (!punishments.length) return picked;

  const insert = punishments[0]!;
  const leveledIdx = picked.findIndex((e) => e.level >= 1);
  if (leveledIdx < 0) return [...picked, insert];

  let replaceIdx = leveledIdx;
  let worstScore = getSpellCombatTierScore(picked[leveledIdx]!.name);
  for (let i = 0; i < picked.length; i += 1) {
    const e = picked[i]!;
    if (e.level < 1) continue;
    const score = getSpellCombatTierScore(e.name);
    if (score < worstScore) {
      worstScore = score;
      replaceIdx = i;
    }
  }

  const out = [...picked];
  out[replaceIdx] = insert;
  return out;
}
