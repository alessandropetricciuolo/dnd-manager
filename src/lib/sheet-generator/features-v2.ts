import type { CharacterBuildOverrides } from "@/lib/sheet-generator/build-choices-types";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

/** Evidenza del manuale usata dalla pipeline V2. Il testo finale non può uscire da qui. */
export type FeatureEvidenceV2 = {
  id: string;
  kind: "racial" | "class";
  manual: string;
  section: string;
  title: string;
  unlockLevel: number | null;
  sourceSnippet: string;
  selected: boolean;
  reason: string;
};

export type FeatureSummaryV2 = {
  fields: { Features_Main: string; Feat_Racial: string };
  classText: string;
  racialText: string;
  evidence: FeatureEvidenceV2[];
  diagnostics: {
    mode: "deterministic-extractive";
    verifiedByManual: boolean;
    unresolved: string[];
  };
};

const MAX_CLASS_CHARS = 1400;
const MAX_RACIAL_CHARS = 900;

function plain(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text: string): string {
  return plain(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function levelFrom(text: string): number | null {
  const match = text.match(/\b(?:dal|al|a partire dal|quando arriva al|arriva al)\s+(\d{1,2})[°º]?\s+livello\b/i) ?? text.match(/\b(\d{1,2})[°º]?\s+livello\b/i);
  const level = match ? Number.parseInt(match[1], 10) : NaN;
  return Number.isFinite(level) ? level : null;
}

function firstSentence(text: string): string {
  const value = plain(text);
  if (!value) return "";
  return (value.match(/^.*?(?:[.!?](?:\s|$)|$)/)?.[0] ?? value).trim();
}

function compact(lines: string[], max: number): string {
  let out = lines.filter(Boolean).join("\n");
  if (out.length <= max) return out;
  const accepted: string[] = [];
  let length = 0;
  for (const line of lines) {
    const next = accepted.length ? `${accepted.join("\n")}\n${line}` : line;
    if (next.length > max) break;
    accepted.push(line);
    length = next.length;
  }
  if (accepted.length) return accepted.join("\n");
  return out.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function isExcludedClass(title: string, body: string): boolean {
  const h = normalize(title);
  const b = normalize(body);
  return (
    /^(incantesimi|livello inc mo|tesoro|attacchi|tratti|privilegi|altre competenze)$/.test(h) ||
    /^\d+ livello$/.test(h) ||
    /tempo di lancio|componenti|gittata|durata/.test(b) ||
    /\btrucchetto\b|\bslot totali\b|\bslot spesi\b/.test(b) ||
    /tm & ©|wizards of the coast/.test(b)
  );
}

function isExcludedRacial(title: string): boolean {
  return /^(eta|allineamento|nomi|sottorazze|tratti|tratti razziali)$/.test(normalize(title));
}

function splitHeadings(markdown: string): Array<{ title: string; body: string }> {
  const rows: Array<{ title: string; body: string }> = [];
  let title = "";
  let body: string[] = [];
  const flush = () => {
    if (title.trim() && body.join("\n").trim()) rows.push({ title: title.trim(), body: body.join("\n").trim() });
    title = "";
    body = [];
  };
  for (const line of markdown.replace(/\r/g, "").split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (heading) {
      flush();
      title = heading[1];
    } else if (title) body.push(line);
  }
  flush();
  return rows;
}

function splitBoldTraits(markdown: string): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string }> = [];
  const re = /\*{2,3}([^*]+?)\.?\*{2,3}\s*([\s\S]*?)(?=\n\s*\*{2,3}[^*]+?\.?\*{2,3}|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown.replace(/\r/g, ""))) !== null) {
    if (match[1]?.trim() && match[2]?.trim()) out.push({ title: match[1].trim(), body: match[2].trim() });
  }
  return out;
}

function selectedByOverride(title: string, body: string, overrides?: CharacterBuildOverrides): boolean {
  const haystack = normalize(`${title} ${body}`);
  const selected = [
    ...(overrides?.fightingStyle ? [overrides.fightingStyle] : []),
    ...(overrides?.warlockPact ? [overrides.warlockPact] : []),
    ...(overrides?.warlockInvocations ?? []),
    ...(overrides?.favoredEnemies ?? []),
    ...(overrides?.favoredTerrains ?? []),
  ].map(normalize);
  if (!selected.length) return false;
  return selected.some((value) => value && haystack.includes(value));
}

function evidenceLine(evidence: FeatureEvidenceV2): string {
  return `• ${evidence.title}${evidence.unlockLevel ? ` [Lv ${evidence.unlockLevel}]` : ""}: ${evidence.sourceSnippet}`;
}

export function buildFeatureSummaryV2(
  sheet: GeneratedCharacterSheet,
  overrides?: CharacterBuildOverrides | null
): FeatureSummaryV2 {
  const evidence: FeatureEvidenceV2[] = [];
  const unresolved: string[] = [];
  const level = Math.max(1, sheet.level);

  const racialSources = [
    { section: sheet.raceLabel, markdown: sheet.raceTraitsMd },
    ...(sheet.subraceLabel && sheet.subraceTraitsMd ? [{ section: sheet.subraceLabel, markdown: sheet.subraceTraitsMd }] : []),
  ];
  for (const source of racialSources) {
    const traits = [...splitBoldTraits(source.markdown), ...splitHeadings(source.markdown)];
    for (const trait of traits) {
      if (isExcludedRacial(trait.title)) continue;
      const snippet = firstSentence(trait.body);
      if (!snippet || snippet.length < 4) continue;
      evidence.push({
        id: `racial-${evidence.length + 1}`,
        kind: "racial",
        manual: "Manuale D&D 5e",
        section: source.section,
        title: trait.title.replace(/[.:]+$/, ""),
        unlockLevel: levelFrom(trait.body),
        sourceSnippet: snippet,
        selected: true,
        reason: "Tratto meccanico presente nella sezione razza/sottorazza del manuale.",
      });
    }
  }

  const classSources = [
    { section: sheet.classLabel, markdown: sheet.classFeaturesMd },
    ...(sheet.classSubclass && sheet.subclassFeaturesMd ? [{ section: sheet.classSubclass, markdown: sheet.subclassFeaturesMd }] : []),
  ];
  for (const source of classSources) {
    for (const feature of splitHeadings(source.markdown)) {
      if (isExcludedClass(feature.title, feature.body)) continue;
      const unlockLevel = levelFrom(`${feature.title}\n${feature.body}`);
      if (unlockLevel && unlockLevel > level) continue;
      const snippet = firstSentence(feature.body);
      if (!snippet || snippet.length < 4) continue;
      const selected = selectedByOverride(feature.title, feature.body, overrides ?? undefined) || !/stile di combattimento|dono del patto|suppliche occulte|nemico prescelto|esploratore nato/i.test(feature.title);
      if (!selected) continue;
      evidence.push({
        id: `class-${evidence.length + 1}`,
        kind: "class",
        manual: "Manuale D&D 5e",
        section: source.section,
        title: feature.title.replace(/[.:]+$/, ""),
        unlockLevel,
        sourceSnippet: snippet,
        selected: true,
        reason: unlockLevel ? `Sbloccato entro il livello ${level}.` : "Presente nella sezione della classe selezionata.",
      });
    }
  }

  if (!sheet.raceTraitsMd.trim()) unresolved.push("Tratti razziali non risolti dal manuale.");
  if (!sheet.classFeaturesMd.trim()) unresolved.push("Privilegi di classe non risolti dal manuale.");
  if (sheet.classSubclass && !sheet.subclassFeaturesMd?.trim()) unresolved.push(`Privilegi della sottoclasse «${sheet.classSubclass}» non risolti dal manuale.`);
  if (!evidence.some((item) => item.kind === "racial")) unresolved.push("Nessun tratto razziale meccanico risolto.");
  if (!evidence.some((item) => item.kind === "class")) unresolved.push("Nessun privilegio di classe risolto.");

  const racial = compact(evidence.filter((item) => item.kind === "racial").map(evidenceLine), MAX_RACIAL_CHARS);
  const classes = compact(evidence.filter((item) => item.kind === "class").map(evidenceLine), MAX_CLASS_CHARS);
  return {
    fields: { Features_Main: classes, Feat_Racial: racial },
    classText: classes,
    racialText: racial,
    evidence,
    diagnostics: { mode: "deterministic-extractive", verifiedByManual: evidence.length > 0 && unresolved.length === 0, unresolved },
  };
}
