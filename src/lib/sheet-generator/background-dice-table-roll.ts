/**
 * Nei background PHB molte sezioni usano tabelle «dN»: per la scheda sostituiamo la tabella
 * con una singola riga scelta come dopo un tiro (RNG).
 */

function splitMarkdownPipeCells(line: string): string[] {
  const t = line.trim();
  if (!t.startsWith("|")) return [];
  const core = t.endsWith("|") ? t.slice(1, -1) : t.slice(1);
  return core.split("|").map((c) => c.trim());
}

function isMarkdownPipeSeparatorRow(line: string): boolean {
  const cells = splitMarkdownPipeCells(line);
  return (
    cells.length > 0 &&
    cells.every((c) => {
      const x = c.replace(/\s/g, "");
      return /^:?-{3,}:?$/.test(x);
    })
  );
}

function collectPipeTableLines(lines: string[], startIdx: number): { rows: string[]; nextIdx: number } {
  const rows: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t.startsWith("|")) break;
    rows.push(lines[i]);
    i++;
  }
  return { rows, nextIdx: i };
}

function inferDieSizeFromHeader(headerLine: string): number {
  let max = 0;
  const it = headerLine.matchAll(/\bd\s*(\d+)\b/gi);
  for (const m of it) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}

function parseDiceOutcomePairs(rows: string[], dataStart: number): Map<number, string> {
  const outcomes = new Map<number, string>();
  for (let r = dataStart; r < rows.length; r++) {
    const cells = splitMarkdownPipeCells(rows[r]);
    for (let k = 0; k + 1 < cells.length; k++) {
      const a = cells[k];
      const b = cells[k + 1];
      if (/^\d+$/.test(a) && b && !/^\d+$/.test(b)) {
        outcomes.set(Number.parseInt(a, 10), b);
      }
    }
  }
  return outcomes;
}

function tryResolveDicePipeTable(rows: string[], rng: () => number): string | null {
  if (rows.length < 2) return null;
  const headerCells = splitMarkdownPipeCells(rows[0]);
  if (!headerCells.some((c) => /\bd\s*\d+\b/i.test(c))) return null;

  let dataStart = 1;
  if (rows.length > 1 && isMarkdownPipeSeparatorRow(rows[1])) dataStart = 2;

  const outcomes = parseDiceOutcomePairs(rows, dataStart);
  if (outcomes.size === 0) return null;

  let dieSize = inferDieSizeFromHeader(rows[0]);
  const maxKey = Math.max(...outcomes.keys());
  if (dieSize <= 0) dieSize = maxKey;

  const roll = Math.floor(rng() * dieSize) + 1;
  let chosen = outcomes.get(roll);
  if (!chosen) {
    const sorted = [...outcomes.entries()].sort((a, b) => a[0] - b[0]);
    chosen = sorted[Math.floor(rng() * sorted.length)]?.[1];
  }
  if (!chosen) return null;

  const dieLabel = `d${dieSize}`;
  return `**Esito (${dieLabel}: ${roll}):** ${chosen}`;
}

/**
 * Scorre il markdown e sostituisce ogni tabella pipe il cui header contiene «dN» (tipico dei background PHB)
 * con una riga di esito da tiro simulato.
 */
export function collapseRandomDiceTablesInBackgroundMarkdown(
  md: string,
  rng: () => number = Math.random
): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("|")) {
      const { rows, nextIdx } = collectPipeTableLines(lines, i);
      const resolved = tryResolveDicePipeTable(rows, rng);
      if (resolved) {
        if (out.length && out[out.length - 1].trim() !== "") out.push("");
        out.push(resolved);
        i = nextIdx;
        continue;
      }
      for (const r of rows) out.push(r);
      i = nextIdx;
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
