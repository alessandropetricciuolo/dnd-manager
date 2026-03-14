import GitHubSlugger from "github-slugger";

export type TocEntry = {
  level: number;
  text: string;
  id: string;
};

/**
 * Estrae gli header (##, ###, ecc.) dal Markdown e genera id compatibili con rehype-slug
 * per popolare l'indice (Table of Contents) con link àncora.
 */
export function getHeadingsFromMarkdown(markdown: string): TocEntry[] {
  if (!markdown?.trim()) return [];

  const slugger = new GitHubSlugger();
  const lines = markdown.split("\n");
  const entries: TocEntry[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();
    if (!text) continue;

    const id = slugger.slug(text);
    entries.push({ level, text, id });
  }

  return entries;
}
