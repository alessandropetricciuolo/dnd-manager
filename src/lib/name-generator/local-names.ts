import type { NameGeneratorKind } from "./types";

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickMany<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function capitalize(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const NPC_FIRST = [
  "Aelar",
  "Bryn",
  "Cael",
  "Dara",
  "Elira",
  "Fenris",
  "Garrick",
  "Hilda",
  "Ivara",
  "Joren",
  "Kael",
  "Lyra",
  "Mira",
  "Nolan",
  "Orin",
  "Petra",
  "Quinn",
  "Rhea",
  "Soren",
  "Thalia",
  "Ulric",
  "Vex",
  "Wren",
  "Ysolde",
  "Zephyr",
] as const;

const NPC_LAST = [
  "Cuordiferro",
  "Nottebuia",
  "Spinefalde",
  "Ventoaguzzo",
  "Lanternagrigia",
  "Rocciafonda",
  "Stelladiluna",
  "Fiammascura",
  "Ombrapassante",
  "Corvobianco",
  "Ferroantico",
  "Ruscellochiaro",
  "Torrenera",
  "Viperaargento",
  "Cenereverde",
] as const;

const TAVERN_FIRST = [
  "L'Anguilla",
  "Il Delfino",
  "Il Nano",
  "Il Pegaso",
  "Il Puledro",
  "La Rosa",
  "Il Cervo",
  "Il Lupo",
  "L'Agnello",
  "Il Demone",
  "La Capra",
  "Lo Spirito",
  "Il Falco",
  "Il Grifone",
  "Il Drago",
] as const;

const TAVERN_LAST = [
  "D'Argento",
  "D'Oro",
  "Barcollante",
  "Sorridente",
  "Impennato",
  "Aurea",
  "In Fuga",
  "Ululante",
  "Macellato",
  "Ghignante",
  "Ubriaca",
  "Guizzante",
  "Furioso",
  "Dormiente",
  "Fumante",
] as const;

const PLACE_PREFIX = [
  "Rovine di",
  "Bosco di",
  "Cripta di",
  "Fortezza di",
  "Torre di",
  "Grotte di",
  "Tempio di",
  "Cascata di",
  "Isola di",
  "Valle di",
] as const;

const PLACE_NOUN = [
  "Cenere",
  "Mezzanotte",
  "Smeraldo",
  "Tuoni",
  "Vetro",
  "Corvi",
  "Spine",
  "Nebbia",
  "Fulmini",
  "Ossa",
  "Stelle",
  "Cenere",
  "Rugiada",
  "Pietra Nera",
] as const;

const MONSTER_EPITHET = [
  "delle Paludi",
  "di Ferro",
  "d'Ossidiana",
  "del Vuoto",
  "Cremisi",
  "della Cripta",
  "Notturno",
  "Brado",
  "Corrotto",
  "Antico",
] as const;

const MONSTER_BASE = [
  "Stirge",
  "Wight",
  "Basilisco",
  "Gargoyle",
  "Drago",
  "Troll",
  "Spettro",
  "Idra",
  "Chimera",
  "Golem",
  "Lich",
  "Manticora",
] as const;

const ITEM_PREFIX = [
  "Lama di",
  "Anello di",
  "Mantello di",
  "Bastone di",
  "Amuleto di",
  "Corona di",
  "Scudo di",
  "Arco di",
] as const;

const ITEM_NOUN = [
  "Cenere",
  "Luna",
  "Tuono",
  "Verità",
  "Ombre",
  "Alba",
  "Gelo",
  "Sole",
  "Vento",
  "Radici",
] as const;

const LORE_TITLES = [
  "La caduta della casata Valdris",
  "Cronache della Guerra dei Tre Regni",
  "Il patto sotto la luna nera",
  "Leggende del Mare di Vetro",
  "I sette sigilli perduti",
  "Profecia del Re Senza Corona",
  "Erede del fuoco antico",
  "Il giuramento dei Custodi",
] as const;

const MISSION_VERB = [
  "Recuperare",
  "Indagare su",
  "Proteggere",
  "Liberare",
  "Esplorare",
  "Catturare",
  "Negoziare con",
  "Distruggere",
] as const;

const MISSION_OBJECT = [
  "l'antico artefatto",
  "il mago recluso",
  "la reliquia rubata",
  "la minaccia nelle miniere",
  "il nido nel bosco",
  "il culto segreto",
  "il carovana scomparsa",
  "la reliquia maledetta",
] as const;

const CAMPAIGN_TITLES = [
  "Le Ombre di Val-Kor",
  "Canto delle Ceneri",
  "La Corona Spezzata",
  "Mare di Vetro",
  "Stirpe del Drago Dormiente",
  "Confine del Crepuscolo",
  "Echi di Pietra Antica",
  "La Strada dei Corvi",
] as const;

const GUILD_NAMES = [
  "Lama d'Aurum",
  "Compagnia del Corvo",
  "Ordine della Lanterna",
  "Fratellanza di Ferro",
  "Gilda del Vento Grigio",
  "Cacciatori di Reliquie",
  "Guardiani del Passo",
  "Lupi di Mezzanotte",
] as const;

const SCENE_NAMES = [
  "Cripta sommersa",
  "Antro del culto",
  "Rovine del monastero",
  "Fortezza di confine",
  "Taverna del porto",
  "Bosco maledetto",
  "Santuario dimenticato",
  "Dungeon delle spine",
] as const;

function generateNpcName(): string {
  return `${pick(NPC_FIRST)} ${pick(NPC_LAST)}`;
}

function generateLocationName(): string {
  if (Math.random() < 0.45) {
    return `${pick(TAVERN_FIRST)} ${pick(TAVERN_LAST)}`;
  }
  return `${pick(PLACE_PREFIX)} ${pick(PLACE_NOUN)}`;
}

function generateMonsterName(): string {
  if (Math.random() < 0.35) {
    return `${pick(MONSTER_BASE)} ${pick(MONSTER_EPITHET)}`;
  }
  return `${pick(NPC_FIRST)} il ${pick(MONSTER_BASE)}`;
}

function generateItemName(): string {
  return `${pick(ITEM_PREFIX)} ${pick(ITEM_NOUN)}`;
}

function generateLoreTitle(): string {
  return pick(LORE_TITLES);
}

function generateCharacterName(): string {
  return generateNpcName();
}

function generateMissionTitle(): string {
  return `${pick(MISSION_VERB)} ${pick(MISSION_OBJECT)}`;
}

function generateCampaignTitle(): string {
  return pick(CAMPAIGN_TITLES);
}

function generateGuildName(): string {
  return pick(GUILD_NAMES);
}

function generateSceneName(): string {
  return pick(SCENE_NAMES);
}

function generateOne(kind: NameGeneratorKind): string {
  switch (kind) {
    case "npc":
      return generateNpcName();
    case "location":
      return generateLocationName();
    case "monster":
      return generateMonsterName();
    case "item":
    case "magic_item":
      return generateItemName();
    case "lore":
      return generateLoreTitle();
    case "character":
      return generateCharacterName();
    case "mission":
      return generateMissionTitle();
    case "campaign":
      return generateCampaignTitle();
    case "guild":
      return generateGuildName();
    case "scene":
      return generateSceneName();
    default:
      return generateNpcName();
  }
}

/** Genera nomi locali unici (senza IA). */
export function generateLocalNameSuggestions(
  kind: NameGeneratorKind,
  count = 5
): string[] {
  const target = Math.max(1, Math.min(count, 8));
  const seen = new Set<string>();
  const out: string[] = [];
  let attempts = 0;
  while (out.length < target && attempts < target * 12) {
    attempts += 1;
    const name = capitalize(generateOne(kind));
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
