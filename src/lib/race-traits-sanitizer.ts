export function sanitizeRaceTraitsMarkdown(raceSlug: string | null | undefined, md: string): string {
  const slug = (raceSlug ?? "").trim().toLowerCase();
  let text = (md ?? "").replace(/\r/g, "");
  if (!text.trim()) return "";

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
