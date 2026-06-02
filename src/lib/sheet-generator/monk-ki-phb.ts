import { getPhbMarkdownText } from "@/lib/server/phb-spell-excerpt";

function normalizeHeading(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanKiExcerpt(md: string): string {
  return md
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/^CAPITOLO\s+\d+.*$/gim, "")
    .replace(/^\d{1,4}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHeadingBlock(manualText: string, heading: string, minHeadingLevel = 2): string {
  const txt = manualText.replace(/\r/g, "");
  const normTarget = normalizeHeading(heading);
  const re = new RegExp(`^(#{${minHeadingLevel},6})\\s+(.+?)\\s*$`, "gm");
  let match: RegExpExecArray | null = null;
  let start = -1;
  let level = 0;
  while ((match = re.exec(txt)) !== null) {
    const title = (match[2] ?? "").trim();
    if (normalizeHeading(title) !== normTarget) continue;
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
  return cleanKiExcerpt(rest.slice(0, end).trim());
}

/** Privilegi del ki base e successivi (heading PHB IT). */
const MONK_KI_FEATURE_HEADINGS: Array<{ heading: string; minLevel: number }> = [
  { heading: "DIFESA PAZIENTE", minLevel: 2 },
  { heading: "PASSO DEL VENTO", minLevel: 2 },
  { heading: "RAFFICA DI COLPI", minLevel: 2 },
  { heading: "COLPO STORDENTE", minLevel: 5 },
  { heading: "COLPI KI POTENZIATI", minLevel: 6 },
  { heading: "MENTE LUCIDA", minLevel: 7 },
  { heading: "ANIMA ADAMANTINA", minLevel: 14 },
  { heading: "CORPO VUOTO", minLevel: 18 },
  { heading: "PERFEZIONE INTERIORE", minLevel: 20 },
];

/**
 * Testo integrale Ki + azioni ki disponibili al livello del PG (manuale rapido torneo).
 */
export function buildMonkKiManualBody(level: number): string | null {
  if (level < 2) return null;
  const phb = getPhbMarkdownText();
  if (!phb) return null;

  const parts: string[] = [];
  const intro = extractHeadingBlock(phb, "KI", 2);
  if (intro) parts.push(intro);

  for (const feat of MONK_KI_FEATURE_HEADINGS) {
    if (level < feat.minLevel) continue;
    const block =
      extractHeadingBlock(phb, feat.heading, 2) ||
      extractHeadingBlock(phb, feat.heading, 3);
    if (block) parts.push(block);
  }

  const merged = parts.join("\n\n").trim();
  return merged || null;
}
