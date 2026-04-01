export function getWikiContentBody(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const body = (content as Record<string, unknown>).body;
    if (typeof body === "string") return body.trim();
  }
  return "";
}

/**
 * CommonMark collassa 3+ newline consecutivi in un solo salto tra paragrafi.
 * Inseriamo paragrafi con NBSP così le righe vuote volute restano visibili nel render.
 */
export function preserveMarkdownBlankLines(src: string): string {
  return src.replace(/\n{3,}/g, (block) => {
    const extra = block.length - 2;
    if (extra < 1) return block;
    return `\n\n${Array.from({ length: extra }, () => "\u00a0").join("\n\n")}\n\n`;
  });
}
