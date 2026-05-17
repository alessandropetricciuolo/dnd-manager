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

export function sanitizeRaceTraitsMarkdown(raceSlug: string | null | undefined, md: string): string {
  const slug = (raceSlug ?? "").trim().toLowerCase();
  let text = (md ?? "").replace(/\r/g, "");
  if (!text.trim()) return "";

  text = stripTrailingPhbRaceChapterFooterAfterLinguaggi(text);

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
