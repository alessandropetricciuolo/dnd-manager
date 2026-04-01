export function getWikiContentBody(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const body = (content as Record<string, unknown>).body;
    if (typeof body === "string") return body.trim();
  }
  return "";
}

/**
 * CommonMark collassa spesso le righe “vuote” tra paragrafi (e senza @tailwindcss/typography
 * i <p> hanno margin 0 da Preflight, quindi sembrano sparire). Qui:
 * - normalizziamo fine riga
 * - per 3+ newline consecutive inseriamo paragrafi con NBSP così restano altezza visibile
 */
export function preserveMarkdownBlankLines(src: string): string {
  const normalized = src.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.replace(/\n{3,}/g, (block) => {
    const extra = block.length - 2;
    if (extra < 1) return block;
    return `\n\n${Array.from({ length: extra }, () => "\u00a0").join("\n\n")}\n\n`;
  });
}
