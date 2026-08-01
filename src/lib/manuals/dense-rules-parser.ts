/**
 * Spezza markdown regole in sezioni stile 5e.tools (titolo + corpo).
 */

export type DenseRulesSection = {
  title: string;
  bodyMarkdown: string;
  collapsedDefault?: boolean;
};

export type DenseRulesDoc = {
  sourceLabel: string | null;
  sections: DenseRulesSection[];
  /** Se il parsing fallisce, tutto il testo grezzo. */
  fallbackMarkdown: string;
};

function stripHashes(title: string): string {
  return title.replace(/^#+\s*/, "").trim();
}

/**
 * Raggruppa per heading ATX (# / ## / ###). Il primo blocco senza heading
 * diventa sezione con titolo dalla query o "Regola".
 */
export function parseDenseRulesDoc(
  markdown: string,
  opts?: { sourceLabel?: string | null; fallbackTitle?: string | null }
): DenseRulesDoc {
  const raw = (markdown ?? "").replace(/\r\n/g, "\n").trim();
  const sourceLabel = opts?.sourceLabel ?? null;
  if (!raw) {
    return { sourceLabel, sections: [], fallbackMarkdown: "" };
  }

  const lines = raw.split("\n");
  const sections: DenseRulesSection[] = [];
  let currentTitle: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (!currentTitle && !body) return;
    sections.push({
      title: currentTitle ?? opts?.fallbackTitle?.trim() ?? "Regola",
      bodyMarkdown: body,
    });
    buf = [];
  };

  for (const line of lines) {
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      flush();
      currentTitle = stripHashes(hm[2]);
      continue;
    }
    buf.push(line);
  }
  flush();

  // Deduplica titoli consecutivi identici (es. SPESE DELLO STILE DI VITA ripetuto)
  const deduped: DenseRulesSection[] = [];
  for (const sec of sections) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.title.toLocaleLowerCase("it") === sec.title.toLocaleLowerCase("it")) {
      prev.bodyMarkdown = [prev.bodyMarkdown, sec.bodyMarkdown].filter(Boolean).join("\n\n");
      continue;
    }
    deduped.push({ ...sec });
  }

  return {
    sourceLabel,
    sections: deduped.length ? deduped : [{ title: opts?.fallbackTitle ?? "Regola", bodyMarkdown: raw }],
    fallbackMarkdown: raw,
  };
}
