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
  const levelMatch = text.match(/\blivello\s*(\d{1,2})\b/i) ?? text.match(/\blvl\s*(\d{1,2})\b/i);
  if (levelMatch?.[1]) {
    params.npcLevel = levelMatch[1];
  }
  return params;
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
