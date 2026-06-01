import { normalizeSpellNameForTier } from "@/lib/sheet-generator/spell-combat-tier";
import { getManualMarkdownByFileName, getPhbMarkdownText } from "@/lib/server/phb-spell-excerpt";

const XANATHAR_MD = "xanathar.md";

/** Nome visualizzato / alias → titolo sezione nel manuale (senza accenti, maiuscolo). */
export const WARLOCK_INVOCATION_PHB_HEADING: Record<string, string> = {
  [normalizeSpellNameForTier("Agonizing Blast")]: "DEFLAGRAZIONE AGONIZZANTE",
  [normalizeSpellNameForTier("Deflagrazione Agonizzante")]: "DEFLAGRAZIONE AGONIZZANTE",
  [normalizeSpellNameForTier("Armatura delle Ombre")]: "ARMATURA DELLE OMBRE",
  [normalizeSpellNameForTier("Vista del Diavolo")]: "VISTA DEL DIAVOLO",
  [normalizeSpellNameForTier("Impulso Repellente")]: "DEFLAGRAZIONE RESPINGENTE",
  [normalizeSpellNameForTier("Deflagrazione Respingente")]: "DEFLAGRAZIONE RESPINGENTE",
  [normalizeSpellNameForTier("Lance of Lethargy")]: "LANCIA DELLA LETARGIA",
  [normalizeSpellNameForTier("Lancia della Letargia")]: "LANCIA DELLA LETARGIA",
  [normalizeSpellNameForTier("Mille Volti")]: "MASCHERA DEI MOLTI VOLTI",
  [normalizeSpellNameForTier("Maschera di Molti Volti")]: "MASCHERA DEI MOLTI VOLTI",
  [normalizeSpellNameForTier("Maschera dei Molti Volti")]: "MASCHERA DEI MOLTI VOLTI",
  [normalizeSpellNameForTier("Sussurri della Tomba")]: "SUSSURRI DALLA TOMBA",
  [normalizeSpellNameForTier("Sussurri dalla Tomba")]: "SUSSURRI DALLA TOMBA",
  [normalizeSpellNameForTier("Mire della Strega")]: "VISTA DELL'OCCULTO",
  [normalizeSpellNameForTier("Vista dell'Occulto")]: "VISTA DELL'OCCULTO",
  [normalizeSpellNameForTier("Libro dei Segreti Antichi")]: "LIBRO DEGLI ANTICHI SEGRETI",
  [normalizeSpellNameForTier("Voce del Signore della Catena")]: "VOCE DEL SIGNORE DELLE CATENE",
  [normalizeSpellNameForTier("Sete della Lama")]: "LAMA ASSETATA",
  [normalizeSpellNameForTier("Lama Assetata")]: "LAMA ASSETATA",
  [normalizeSpellNameForTier("Catene di Carceri")]: "CATENE DI CARCERI",
  [normalizeSpellNameForTier("Maestro di Miriadi Forme")]: "MAESTRO DI MILLE FORME",
  [normalizeSpellNameForTier("Maestro di Mille Forme")]: "MAESTRO DI MILLE FORME",
  [normalizeSpellNameForTier("Sguardo di Due Menti")]: "SGUARDO DELLE DUE MENTI",
  [normalizeSpellNameForTier("Sguardo delle Due Menti")]: "SGUARDO DELLE DUE MENTI",
};

const INVOCATION_MANUAL_FILES: Record<string, string> = {
  [normalizeSpellNameForTier("LANCIA DELLA LETARGIA")]: XANATHAR_MD,
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanInvocationExcerpt(md: string): string {
  return md
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/^CAPITOLO\s+\d+.*$/gim, "")
    .replace(/^Offrimi un caffè:.*$/gim, "")
    .replace(/<sub>[^<]*<\/sub>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHeadingBlock(manualText: string, heading: string, minHeadingLevel = 2): string {
  const txt = manualText.replace(/\r/g, "");
  const normTarget = normalizeSpellNameForTier(heading);
  const re = new RegExp(`^(#{${minHeadingLevel},6})\\s+(.+?)\\s*$`, "gm");
  let match: RegExpExecArray | null = null;
  let start = -1;
  let level = 0;
  while ((match = re.exec(txt)) !== null) {
    const title = (match[2] ?? "").trim();
    if (normalizeSpellNameForTier(title) !== normTarget) continue;
    start = match.index;
    level = (match[1] ?? "##").length;
    break;
  }
  if (start < 0) return "";

  const rest = txt.slice(start);
  const firstLineEnd = rest.indexOf("\n");
  const bodyStart = firstLineEnd >= 0 ? firstLineEnd + 1 : rest.length;
  const afterTitle = rest.slice(bodyStart);
  const next = new RegExp(`^#{1,${level}}\\s+\\S`, "m").exec(afterTitle);
  const end = next?.index != null ? bodyStart + next.index : rest.length;
  return cleanInvocationExcerpt(rest.slice(0, end).trim());
}

function invocationCatalogSlice(manualText: string): string {
  const txt = manualText.replace(/\r/g, "");
  const marker = /^#\s+SUPPLICHE OCCULTE\s*\nSe una supplica occulta prevede/im;
  const m = marker.exec(txt);
  if (m?.index != null) return txt.slice(m.index);
  const fallback = txt.search(/^#\s+SUPPLICHE OCCULTE\s*$/im);
  return fallback >= 0 ? txt.slice(fallback) : txt;
}

export function resolveWarlockInvocationPhbHeading(displayName: string): string {
  const key = normalizeSpellNameForTier(displayName);
  return WARLOCK_INVOCATION_PHB_HEADING[key] ?? displayName.trim().toUpperCase();
}

/** Testo completo di una supplica occulta dal manuale (PHB o supplemento). */
export function extractWarlockInvocationMarkdown(displayName: string): string {
  const heading = resolveWarlockInvocationPhbHeading(displayName);
  const normHeading = normalizeSpellNameForTier(heading);
  const manualFile = INVOCATION_MANUAL_FILES[normHeading];
  if (manualFile) {
    const sup = getManualMarkdownByFileName(manualFile);
    if (sup) {
      const fromSup = extractHeadingBlock(sup, heading, 1);
      if (fromSup) return fromSup;
    }
  }
  const phb = getPhbMarkdownText();
  if (!phb) return "";
  return extractHeadingBlock(invocationCatalogSlice(phb), heading, 2);
}

export function parseWarlockPactChoice(classFeaturesMd: string): string | null {
  const m = classFeaturesMd.match(/Scelta:\s*\*\*([^*]+)\*\*/i);
  return m?.[1]?.trim() || null;
}

export function parseWarlockSelectedInvocationNames(classFeaturesMd: string): string[] {
  const section = classFeaturesMd.split(/###\s+Suppliche Occulte/i)[1] ?? "";
  const names: string[] = [];
  const seen = new Set<string>();
  for (const m of section.matchAll(/-\s+\*\*([^*]+)\*\*/g)) {
    const name = (m[1] ?? "").trim();
    if (!name) continue;
    const key = normalizeSpellNameForTier(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

const WARLOCK_PACT_PHB_HEADING: Record<string, string> = {
  [normalizeSpellNameForTier("Patto della Catena")]: "PATTO DELLA CATENA",
  [normalizeSpellNameForTier("Patto della Lama")]: "PATTO DELLA LAMA",
  [normalizeSpellNameForTier("Patto del Tomo")]: "PATTO DEL TOMO",
};

/** Testo completo del Dono del Patto scelto (sezione #### nel PHB). */
export function extractPhbWarlockPactMarkdown(pactName: string): string {
  const phb = getPhbMarkdownText();
  if (!phb) return "";
  const heading = WARLOCK_PACT_PHB_HEADING[normalizeSpellNameForTier(pactName)];
  if (!heading) return "";
  return extractHeadingBlock(phb, heading, 4);
}

/** Corpo manuale rapido: patto + suppliche selezionate, testo integrale. */
export function buildWarlockInvocationsManualBody(classFeaturesMd: string): string | null {
  const parts: string[] = [];

  const pact = parseWarlockPactChoice(classFeaturesMd);
  if (pact) {
    const pactMd = extractPhbWarlockPactMarkdown(pact);
    if (pactMd) parts.push(pactMd);
  }

  for (const name of parseWarlockSelectedInvocationNames(classFeaturesMd)) {
    const md = extractWarlockInvocationMarkdown(name);
    if (md) parts.push(md);
  }

  const merged = parts.join("\n\n").trim();
  return merged || null;
}
