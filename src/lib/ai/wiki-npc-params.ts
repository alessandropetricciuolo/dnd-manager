import type { WikiMarkdownExtraParams } from "./wiki-text-generator";

const RACE_ALIASES: { pattern: RegExp; label: string }[] = [
  { pattern: /\bhalfling\b|\bhobbit\b|\bpiedelesto\b|\bmezzuomo\b/i, label: "Halfling" },
  { pattern: /\belfo\b|\belf\b|\belfica\b/i, label: "Elfo" },
  { pattern: /\bnano\b|\bnana\b|\bdwarves?\b/i, label: "Nano" },
  { pattern: /\bumano\b|\bumana\b/i, label: "Umano" },
  { pattern: /\bmezzelfo\b|\bmezzelfa\b/i, label: "Mezzelfo" },
  { pattern: /\btiefling\b/i, label: "Tiefling" },
  { pattern: /\bdrow\b/i, label: "Drow" },
  { pattern: /\bdragonide\b/i, label: "Dragonide" },
  { pattern: /\bgnomo\b|\bgnoma\b/i, label: "Gnomo" },
  { pattern: /\bmezzorco\b|\bmezzorca\b|\borco\b|\borca\b/i, label: "Mezzorco" },
];

const CLASS_ALIASES: { pattern: RegExp; label: string }[] = [
  // Classi di PNG (Guida del DM cap. 4). Per parole comuni (esperto, combattente)
  // il match richiede il contesto "classe X" o "X livello N" per evitare falsi positivi.
  { pattern: /\bpopolan[oa]\b|\bcommoner\b/i, label: "Popolano" },
  { pattern: /\badept[oa]\b|\badept\b/i, label: "Adepto" },
  { pattern: /\baristocratic[oa]\b|\baristocrat\b/i, label: "Aristocratico" },
  { pattern: /\bclasse\s+combattente\b|\bcombattente\s+(?:di\s+)?livello\b|\bwarrior\b/i, label: "Combattente" },
  { pattern: /\bclasse\s+espert[oa]\b|\bespert[oa]\s+(?:di\s+)?livello\b|\bexpert\b/i, label: "Esperto" },
  { pattern: /\bbarbaro\b|\bbarbarian\b/i, label: "Barbaro" },
  { pattern: /\bguerriero\b|\bfighter\b/i, label: "Guerriero" },
  { pattern: /\bmago\b|\bwizard\b/i, label: "Mago" },
  { pattern: /\bladro\b|\brogue\b/i, label: "Ladro" },
  { pattern: /\bchierico\b|\bcleric\b/i, label: "Chierico" },
  { pattern: /\bdruido\b|\bdruid\b/i, label: "Druido" },
  { pattern: /\bbardo\b|\bbard\b/i, label: "Bardo" },
  { pattern: /\bmonaco\b|\bmonk\b/i, label: "Monaco" },
  { pattern: /\bpaladino\b|\bpaladin\b/i, label: "Paladino" },
  { pattern: /\branger\b|\bcacciatore\b/i, label: "Ranger" },
  { pattern: /\bstregone\b|\bsorcerer\b/i, label: "Stregone" },
  { pattern: /\bwarlock\b|\bstregone\s+di\s+patto\b/i, label: "Warlock" },
  { pattern: /\bartefice\b|\bartificer\b/i, label: "Artefice" },
];

/**
 * Classi di PNG "civili" (Guida del DM cap. 4): non hanno privilegi di classe
 * sui manuali del giocatore, quindi statblock e ritratto seguono l'occupazione,
 * non l'archetipo da avventuriero.
 */
const CIVILIAN_NPC_CLASS_ALIASES: { pattern: RegExp; label: string }[] = [
  { pattern: /^popolan[oa]$|^commoner$/i, label: "Popolano" },
  { pattern: /^adept[oa]$|^adept$/i, label: "Adepto" },
  { pattern: /^aristocratic[oa]$|^aristocrat$/i, label: "Aristocratico" },
  { pattern: /^combattente$|^warrior$/i, label: "Combattente" },
  { pattern: /^espert[oa]$|^expert$/i, label: "Esperto" },
];

/** Se la classe indicata è una classe di PNG civile, restituisce il nome canonico; altrimenti null. */
export function normalizeNpcCivilianClass(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  for (const { pattern, label } of CIVILIAN_NPC_CLASS_ALIASES) {
    if (pattern.test(trimmed)) return label;
  }
  return null;
}

/** Istruzioni statblock/aspetto per le classi di PNG civili (statblock "tranquillo"). */
export function civilianNpcPromptGuide(civilianClass: string): string {
  const base = [
    "Questa è una CLASSE DI PNG (Guida del DM), NON una classe da avventuriero:",
    "per la [MECCANICA] genera uno statblock SEMPLICE da PNG: CA e PF bassi/modesti,",
    "caratteristiche vicine a 10 (salvo 1-2 legate al mestiere), poche abilità coerenti",
    "con l'occupazione, al massimo 1 attacco base. NESSUN privilegio di classe da avventuriero",
    "(niente ira, attacco furtivo, incantesimi da mago, ecc.).",
  ].join(" ");
  const perClass: Record<string, string> = {
    Popolano:
      "Archetipo Popolano: cittadino comune (contadino, cameriera, locandiere, bottegaio). CA 10 (nessuna armatura), PF molto bassi (circa 4, +2-3 per livello oltre il 1°), attacco improvvisato (+2, 1d4). Nessuna magia.",
    Esperto:
      "Archetipo Esperto: professionista qualificato (artigiano, guida, studioso, mercante esperto). CA 10-12, PF modesti, bonus alti (+4/+6) in 3-4 abilità del mestiere. Nessuna magia, niente armi da guerra.",
    Aristocratico:
      "Archetipo Aristocratico: nobile o alto borghese. CA 11 (abiti pregiati), PF modesti, Carisma alto, abilità sociali (Persuasione, Intuizione, Storia). Al massimo un'arma elegante da parata (es. stocco +2).",
    Adepto:
      "Archetipo Adepto: praticante minore di magia (guaritore di villaggio, accolito, cartomante). PF modesti, 2-3 trucchetti e pochi incantesimi di basso livello a tema (cure minori, benedizioni o piccoli malefici). Nessun incantesimo di livello superiore a metà del livello del PNG.",
    Combattente:
      "Archetipo Combattente: guardia cittadina, soldato semplice, miliziano. CA 12-16 (armatura semplice, eventuale scudo), PF discreti, 1-2 attacchi con armi comuni (lancia, spada corta, balestra leggera). Nessun privilegio da Guerriero (niente Azione Impetuosa o Recupero Energie).",
  };
  const appearance =
    civilianClass === "Combattente"
      ? "Aspetto: equipaggiamento da servizio (uniforme, armatura semplice), non da eroe leggendario."
      : "Aspetto e abbigliamento devono riflettere l'occupazione civile e il rango sociale (abiti da lavoro, grembiule, vesti pregiate…): NIENTE armi da guerra, armature o pose da combattimento, salvo esplicita richiesta del Master.";
  return [base, perClass[civilianClass] ?? "", appearance].filter(Boolean).join("\n");
}

export function extractNpcBuildParams(text: string): WikiMarkdownExtraParams {
  const params: WikiMarkdownExtraParams = {};
  for (const { pattern, label } of RACE_ALIASES) {
    if (pattern.test(text)) {
      params.npcRace = label;
      break;
    }
  }
  for (const { pattern, label } of CLASS_ALIASES) {
    if (pattern.test(text)) {
      params.npcClass = label;
      break;
    }
  }
  const levelMatch =
    text.match(/\blivello\s*(\d{1,2})\b/i) ??
    text.match(/\blvl\.?\s*(\d{1,2})\b/i) ??
    text.match(/\blv\.?\s*(\d{1,2})\b/i) ??
    text.match(/\b(\d{1,2})\s*°?\s*livello\b/i);
  if (levelMatch?.[1]) {
    params.npcLevel = levelMatch[1];
  }
  return params;
}

export function listMissingNpcMechanics(params: WikiMarkdownExtraParams): string[] {
  const missing: string[] = [];
  if (!params.npcRace?.trim()) missing.push("razza");
  if (!params.npcClass?.trim()) missing.push("classe");
  if (!params.npcLevel?.trim()) missing.push("livello");
  return missing;
}

export function formatNpcMechanicsQuestion(params: WikiMarkdownExtraParams): string {
  const missing = listMissingNpcMechanics(params);
  if (missing.length === 0) return "";

  const known = [
    params.npcRace?.trim() ? `Razza: **${params.npcRace.trim()}**` : null,
    params.npcClass?.trim() ? `Classe: **${params.npcClass.trim()}**` : null,
    params.npcLevel?.trim() ? `Livello: **${params.npcLevel.trim()}**` : null,
  ].filter(Boolean);

  return [
    "Per generare lo **statblock D&D 5e** dell'NPC servono **razza**, **classe** e **livello**.",
    known.length ? `Ho già: ${known.join(" · ")}.` : null,
    `Mancano: **${missing.join(", ")}**.`,
    "Scrivi i dati mancanti in chat (es. `ladro livello 5` o `halfling guerriero livello 3`).",
  ]
    .filter(Boolean)
    .join("\n");
}

export function hasNpcMechanicsParams(params: WikiMarkdownExtraParams): boolean {
  return Boolean(
    params.npcRace?.trim() && params.npcClass?.trim() && params.npcLevel?.trim()
  );
}

export function mergeWikiExtraParams(
  ...sources: Array<WikiMarkdownExtraParams | undefined | null>
): WikiMarkdownExtraParams {
  const out: WikiMarkdownExtraParams = {};
  for (const src of sources) {
    if (!src) continue;
    if (!out.npcRace && src.npcRace) out.npcRace = src.npcRace;
    if (!out.npcClass && src.npcClass) out.npcClass = src.npcClass;
    if (!out.npcLevel && src.npcLevel) out.npcLevel = src.npcLevel;
    if (!out.cr && src.cr) out.cr = src.cr;
    if (!out.rarity && src.rarity) out.rarity = src.rarity;
  }
  return out;
}
