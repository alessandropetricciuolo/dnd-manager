/**
 * Parser densità stile 5e.tools per statblock italiani (MM / Multiverso / wiki).
 * Input: markdown (eventualmente con tabella HTML già convertita o grezza).
 */

export type DenseAbilityKey = "FOR" | "DES" | "COS" | "INT" | "SAG" | "CAR";

export type DenseAbilityScore = {
  score: number;
  mod: string;
  save: string;
};

export type DenseNamedBlock = {
  name: string;
  body: string;
};

export type DenseStatblock = {
  name: string;
  typeLine: string | null;
  sourceLabel: string | null;
  ac: string | null;
  initiative: string | null;
  hp: string | null;
  speed: string | null;
  cr: string | null;
  xp: string | null;
  abilities: Partial<Record<DenseAbilityKey, DenseAbilityScore>>;
  skills: string | null;
  savesLine: string | null;
  damageResistances: string | null;
  damageImmunities: string | null;
  damageVulnerabilities: string | null;
  conditionImmunities: string | null;
  senses: string | null;
  languages: string | null;
  traits: DenseNamedBlock[];
  actions: DenseNamedBlock[];
  bonusActions: DenseNamedBlock[];
  reactions: DenseNamedBlock[];
  legendaryActions: DenseNamedBlock[];
  /** Testo non strutturato residuo (fallback). */
  leftoverMarkdown: string;
  parseConfidence: "high" | "medium" | "low";
};

const ABILITY_ORDER: DenseAbilityKey[] = ["FOR", "DES", "COS", "INT", "SAG", "CAR"];

const ABILITY_ALIASES: Record<string, DenseAbilityKey> = {
  FOR: "FOR",
  STR: "FOR",
  DES: "DES",
  DEX: "DES",
  COS: "COS",
  CON: "COS",
  INT: "INT",
  SAG: "SAG",
  WIS: "SAG",
  CAR: "CAR",
  CHA: "CAR",
};

function stripMd(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .trim();
}

function abilityModFromScore(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function parseScoreCell(raw: string): { score: number; mod: string } | null {
  const t = stripMd(raw);
  const m = t.match(/^(\d{1,2})\s*(?:\(([+-]?\d+)\))?/);
  if (!m) return null;
  const score = Number(m[1]);
  if (!Number.isFinite(score)) return null;
  const mod = m[2] != null ? (m[2].startsWith("+") || m[2].startsWith("-") ? m[2] : `+${m[2]}`) : abilityModFromScore(score);
  return { score, mod };
}

function boldField(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`\\*\\*${label}\\*\\*\\s*[:]?\\s*([^\\n*]+)`, "i");
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
    const rePlain = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*([^\\n]+)`, "i");
    const m2 = text.match(rePlain);
    if (m2?.[1]) return m2[1].trim();
  }
  return null;
}

function parseHtmlAbilityTable(text: string): Partial<Record<DenseAbilityKey, DenseAbilityScore>> {
  const out: Partial<Record<DenseAbilityKey, DenseAbilityScore>> = {};
  const tableMatch = text.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return out;
  const html = tableMatch[0];
  const headers = Array.from(html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)).map((m) =>
    stripMd(m[1].replace(/<[^>]+>/g, "")).toUpperCase()
  );
  const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  let bodyCells: string[] = [];
  for (const row of rows) {
    const tds = Array.from(row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    );
    if (tds.length >= 6) {
      bodyCells = tds;
      break;
    }
  }
  if (headers.length >= 6 && bodyCells.length >= 6) {
    for (let i = 0; i < 6; i++) {
      const key = ABILITY_ALIASES[headers[i] ?? ""];
      const parsed = parseScoreCell(bodyCells[i] ?? "");
      if (key && parsed) out[key] = { ...parsed, save: parsed.mod };
    }
  }
  return out;
}

function parseMarkdownAbilityTable(text: string): Partial<Record<DenseAbilityKey, DenseAbilityScore>> {
  const out: Partial<Record<DenseAbilityKey, DenseAbilityScore>> = {};
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 2; i++) {
    const header = lines[i] ?? "";
    const sep = lines[i + 1] ?? "";
    const body = lines[i + 2] ?? "";
    if (!/\|/.test(header) || !/\|/.test(body) || !/-{3}/.test(sep)) continue;
    const headers = header
      .split("|")
      .map((c) => stripMd(c).toUpperCase())
      .filter(Boolean);
    const cells = body
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (headers.length < 6 || cells.length < 6) continue;
    let matched = 0;
    for (let j = 0; j < Math.min(headers.length, cells.length); j++) {
      const key = ABILITY_ALIASES[headers[j] ?? ""];
      const parsed = parseScoreCell(cells[j] ?? "");
      if (key && parsed) {
        out[key] = { ...parsed, save: parsed.mod };
        matched += 1;
      }
    }
    if (matched >= 4) return out;
  }
  return out;
}

function parseSavesIntoAbilities(
  savesLine: string | null,
  abilities: Partial<Record<DenseAbilityKey, DenseAbilityScore>>
): void {
  if (!savesLine) return;
  const parts = savesLine.split(/[,;]/);
  for (const part of parts) {
    const m = part.trim().match(/^(For|Des|Cos|Int|Sag|Car|Str|Dex|Con|Wis|Cha)\s*([+-]?\d+)/i);
    if (!m) continue;
    const key = ABILITY_ALIASES[m[1].toUpperCase()];
    if (!key || !abilities[key]) continue;
    const save = m[2].startsWith("+") || m[2].startsWith("-") ? m[2] : `+${m[2]}`;
    abilities[key] = { ...abilities[key]!, save };
  }
}

function extractNamedBlocks(sectionText: string): DenseNamedBlock[] {
  const text = sectionText.replace(/\r/g, "").trim();
  if (!text) return [];
  const blocks: DenseNamedBlock[] = [];
  // ***Name.*** body   OR   **Name.** body
  const re =
    /(?:\*\*\*|__)([^*\n]+?)\.?(?:\*\*\*|__)+\s*([\s\S]*?)(?=(?:\n(?:\*\*\*|__)[^*\n]+?\.?(?:\*\*\*|__)+)|\n#{1,3}\s+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    const name = stripMd(m[1]).replace(/\.$/, "").trim();
    const body = m[2].trim();
    if (name) blocks.push({ name, body });
  }
  if (blocks.length === 0 && text) {
    blocks.push({ name: "", body: text });
  }
  return blocks;
}

function splitSections(markdown: string): {
  header: string;
  traits: string;
  actions: string;
  bonus: string;
  reactions: string;
  legendary: string;
} {
  const text = markdown.replace(/\r/g, "");
  const sectionRe =
    /\n#{1,3}\s*(AZIONI BONUS|AZIONI LEGGENDARIE|AZIONI|REAZIONI|BONUS ACTIONS?|LEGENDARY ACTIONS?|ACTIONS?|REACTIONS?)\s*\n/gi;
  const markers: { name: string; index: number; len: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(text)) != null) {
    markers.push({ name: m[1].toUpperCase(), index: m.index, len: m[0].length });
  }

  if (markers.length === 0) {
    return { header: text, traits: "", actions: "", bonus: "", reactions: "", legendary: "" };
  }

  const header = text.slice(0, markers[0]!.index);
  const bag: Record<string, string> = {};
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i]!.index + markers[i]!.len;
    const end = i + 1 < markers.length ? markers[i + 1]!.index : text.length;
    bag[markers[i]!.name] = text.slice(start, end);
  }

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      for (const [name, val] of Object.entries(bag)) {
        if (name.includes(k)) return val;
      }
    }
    return "";
  };

  // Traits = content after CR / before first ### section, excluding ability table already in header
  return {
    header,
    traits: "",
    actions: pick("AZIONI", "ACTIONS") && !pick("AZIONI BONUS") ? pick("AZIONI", "ACTIONS") : bag["AZIONI"] ?? bag["ACTIONS"] ?? "",
    bonus: pick("BONUS"),
    reactions: pick("REAZIONI", "REACTIONS"),
    legendary: pick("LEGGENDARIE", "LEGENDARY"),
  };
}

function extractTraitsFromHeader(header: string): { meta: string; traitsText: string } {
  // Traits start after **Sfida** / CR line (or languages), as ***Name.*** blocks
  const sfidaIdx = header.search(/\*\*Sfida\*\*/i);
  const crIdx = header.search(/\*\*(?:GS|CR|Challenge)\*\*/i);
  const cut = sfidaIdx >= 0 ? sfidaIdx : crIdx;
  if (cut < 0) {
    const firstTrait = header.search(/\n\*\*\*[^*\n]+\.\*\*\*/);
    if (firstTrait >= 0) {
      return { meta: header.slice(0, firstTrait), traitsText: header.slice(firstTrait) };
    }
    return { meta: header, traitsText: "" };
  }
  const afterLine = header.indexOf("\n", cut);
  const splitAt = afterLine >= 0 ? afterLine + 1 : cut;
  return { meta: header.slice(0, splitAt), traitsText: header.slice(splitAt) };
}

function parseCrXp(raw: string | null): { cr: string | null; xp: string | null } {
  if (!raw) return { cr: null, xp: null };
  const m = raw.match(/([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)\s*(?:\(([^)]+)\))?/);
  if (!m) return { cr: raw.trim(), xp: null };
  return { cr: m[1], xp: m[2]?.replace(/\s*PE\s*$/i, "").trim() ?? null };
}

export function parseDenseStatblock(
  markdown: string,
  opts?: { sourceLabel?: string | null; fallbackName?: string | null }
): DenseStatblock {
  const raw = (markdown ?? "").replace(/\r\n/g, "\n").trim();
  const empty: DenseStatblock = {
    name: opts?.fallbackName?.trim() || "Statblock",
    typeLine: null,
    sourceLabel: opts?.sourceLabel ?? null,
    ac: null,
    initiative: null,
    hp: null,
    speed: null,
    cr: null,
    xp: null,
    abilities: {},
    skills: null,
    savesLine: null,
    damageResistances: null,
    damageImmunities: null,
    damageVulnerabilities: null,
    conditionImmunities: null,
    senses: null,
    languages: null,
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
    leftoverMarkdown: raw,
    parseConfidence: "low",
  };
  if (!raw) return empty;

  const nameMatch = raw.match(/^#{1,3}\s+(.+)$/m);
  const name = stripMd(nameMatch?.[1] ?? opts?.fallbackName ?? "Statblock");

  const typeMatch = raw.match(/\n\s*\*([^*\n]+)\*\s*\n/);
  const typeLine = typeMatch?.[1]?.trim() ?? null;

  const sections = splitSections(raw);
  const { meta, traitsText } = extractTraitsFromHeader(sections.header);

  let abilities = {
    ...parseHtmlAbilityTable(meta),
    ...parseMarkdownAbilityTable(meta),
  };

  const savesLine = boldField(meta, ["Tiri Salvezza", "Saving Throws"]);
  parseSavesIntoAbilities(savesLine, abilities);

  // Ensure all six if we have any
  for (const key of ABILITY_ORDER) {
    if (!abilities[key]) continue;
    if (!abilities[key]!.save) abilities[key]!.save = abilities[key]!.mod;
  }

  const ac = boldField(meta, ["Classe Armatura", "Armor Class", "CA", "AC"]);
  const hp = boldField(meta, ["Punti Ferita", "Punti Vita", "Hit Points", "HP", "PF"]);
  const speed = boldField(meta, ["Velocità", "Speed"]);
  const initiative =
    boldField(meta, ["Iniziativa", "Initiative", "Init"]) ??
    (abilities.DES ? abilities.DES.mod : null);
  const crRaw = boldField(meta, ["Sfida", "Grado di Sfida", "Challenge", "CR", "GS"]);
  const { cr, xp } = parseCrXp(crRaw);

  const skills = boldField(meta, ["Abilità", "Skills"]);
  const damageResistances = boldField(meta, [
    "Resistenze ai Danni",
    "Resistenza ai Danni",
    "Damage Resistances",
    "Resistenze",
  ]);
  const damageImmunities = boldField(meta, ["Immunità ai Danni", "Damage Immunities"]);
  const damageVulnerabilities = boldField(meta, [
    "Vulnerabilità ai Danni",
    "Damage Vulnerabilities",
  ]);
  const conditionImmunities = boldField(meta, [
    "Immunità alle Condizioni",
    "Condition Immunities",
  ]);
  const senses = boldField(meta, ["Sensi", "Senses"]);
  const languages = boldField(meta, ["Linguaggi", "Languages"]);

  // Fix actions pick when AZIONI BONUS steals AZIONI
  let actionsText = sections.actions;
  let bonusText = sections.bonus;
  let reactionsText = sections.reactions;
  let legendaryText = sections.legendary;

  // Re-scan raw for cleaner section split
  const namedSection = (label: RegExp) => {
    const m = raw.match(new RegExp(`\\n#{1,3}\\s*(${label.source})\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s+|$)`, "i"));
    return m?.[2]?.trim() ?? "";
  };
  const actionsOnly = namedSection(/AZIONI(?!\s+BONUS|\s+LEGGENDARIE)|ACTIONS(?!\s+BONUS)/);
  if (actionsOnly) actionsText = actionsOnly;
  const bonusOnly = namedSection(/AZIONI BONUS|BONUS ACTIONS?/);
  if (bonusOnly) bonusText = bonusOnly;
  const reactOnly = namedSection(/REAZIONI|REACTIONS?/);
  if (reactOnly) reactionsText = reactOnly;
  const legOnly = namedSection(/AZIONI LEGGENDARIE|LEGENDARY ACTIONS?/);
  if (legOnly) legendaryText = legOnly;

  const traits = extractNamedBlocks(traitsText).filter((b) => b.name);
  const actions = extractNamedBlocks(actionsText).filter((b) => b.name);
  const bonusActions = extractNamedBlocks(bonusText).filter((b) => b.name);
  const reactions = extractNamedBlocks(reactionsText).filter((b) => b.name);
  const legendaryActions = extractNamedBlocks(legendaryText).filter((b) => b.name);

  const hasCore = Boolean(ac || hp || cr || Object.keys(abilities).length >= 4);
  const confidence: DenseStatblock["parseConfidence"] = hasCore
    ? actions.length || traits.length
      ? "high"
      : "medium"
    : "low";

  return {
    name,
    typeLine,
    sourceLabel: opts?.sourceLabel ?? null,
    ac,
    initiative,
    hp,
    speed,
    cr,
    xp,
    abilities,
    skills,
    savesLine,
    damageResistances,
    damageImmunities,
    damageVulnerabilities,
    conditionImmunities,
    senses,
    languages,
    traits,
    actions,
    bonusActions,
    reactions,
    legendaryActions,
    leftoverMarkdown: confidence === "low" ? raw : "",
    parseConfidence: confidence,
  };
}

export { ABILITY_ORDER };
