/**
 * Nel PHB italiano OCR, dopo il paragrafo «**Linguaggi.**» compare spesso il footer di pagina
 * `CAPITOLO N | …` seguito da teaser/citazioni della razza successiva (prima dell’heading `#`).
 * Tagliamo solo quando dopo quel paragrafo il testo riparte subito con quel footer (caso tipico:
 * mezzorco → tiefling).
 */
export function stripTrailingPhbRaceChapterFooterAfterLinguaggi(md: string): string {
  const text = md.replace(/\r/g, "");
  const lm = /\*\*Linguaggi\.\*\*/i.exec(text);
  if (!lm || lm.index === undefined) return md;

  const fromMarker = text.slice(lm.index);
  const nn = fromMarker.search(/\n\n/);
  if (nn < 0) return md;

  const afterParaAbs = lm.index + nn + 2;
  const rest = text.slice(afterParaAbs);
  const trimmed = rest.trimStart();
  if (!/^CAPITOLO\s+\d+\s*\|/im.test(trimmed)) return md;

  return text.slice(0, afterParaAbs).trimEnd();
}

function normalizeHeadingForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function markdownHeadingLevel(line: string): number | null {
  const m = line.match(/^(#{1,6})\s+/);
  return m ? m[1].length : null;
}

function markdownHeadingText(line: string): string | null {
  const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
  return m ? m[1].trim() : null;
}

/**
 * Nel PHB i tratti base di una razza con sottorazze includono spesso tutte le ## sottorazze.
 * Quando il PG ha una sottorazza scelta, il testo dedicato va in `subraceTraitsMd`:
 * rimuoviamo ogni blocco ## elencato in `subraceSectionHeadings` dal markdown razza base.
 */
export function stripSubraceSectionsFromRaceTraits(
  raceTraitsMd: string,
  subraceSectionHeadings: string[]
): string {
  const text = (raceTraitsMd ?? "").replace(/\r/g, "");
  if (!text.trim() || !subraceSectionHeadings.length) return text.trim();

  const subraceNorms = new Set(
    subraceSectionHeadings.map(normalizeHeadingForMatch).filter(Boolean)
  );
  if (!subraceNorms.size) return text.trim();

  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const lv = markdownHeadingLevel(line);
    const ht = markdownHeadingText(line);
    if (lv === 2 && ht) {
      const n = normalizeHeadingForMatch(ht);
      if (subraceNorms.has(n)) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").trim();
}

export function sanitizeRaceTraitsMarkdown(raceSlug: string | null | undefined, md: string): string {
  const slug = (raceSlug ?? "").trim().toLowerCase();
  let text = (md ?? "").replace(/\r/g, "");
  if (!text.trim()) return "";

  text = stripTrailingPhbRaceChapterFooterAfterLinguaggi(text);

  text = text
    .replace(/^Offrimi un caffè:[\s\S]*?(?=\n\n)/gim, "")
    .replace(/^\d{1,3}\s*$\n?/gm, "")
    .replace(/^CAPITOLO\s+\d+\s*\|.*$/gim, "")
    .replace(/^#\s+SEMPRE ENTUSIASTI[\s\S]*?(?=\n\n\*\*Taglia\.|\n\n\*\*\*Taglia\.)/im, "");

  // In PHB IT mezzelfo c'e una riga OCR/troncata che include l'incipit dei mezzorchi.
  if (slug === "mezzelfo") {
    const leakMarkers = [
      /\nChe uniscano le forze sotto la guida di un potente warlock[\s\S]*$/i,
      /\n#\s*MEZZORCO\b[\s\S]*$/i,
      /\n##\s*TRATTI DEI MEZZORCHI\b[\s\S]*$/i,
    ];
    for (const marker of leakMarkers) {
      text = text.replace(marker, "");
    }
    // Se rimane una congiunzione isolata finale dovuta al taglio PDF, rimuovila.
    text = text.replace(/\n\s*e\s*$/i, "");
  }

  return text.trim();
}
