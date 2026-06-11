export type WikiCatalogEntry = {
  id: string;
  name: string;
  kind: "wiki" | "map";
};

export type ParsedEntityReference = {
  targetType: "wiki" | "map";
  targetId: string;
  label: string;
};

const AUTO_REFERENCE_LABEL = "Menzionato nel testo";

/** Normalizza per confronto nomi (case/accents insensitive). */
export function normalizeEntityNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveCatalogName(
  raw: string,
  catalog: WikiCatalogEntry[],
  excludeId?: string
): ParsedEntityReference | null {
  const key = normalizeEntityNameKey(raw);
  if (!key) return null;

  const wikiMatches = catalog.filter(
    (e) => e.kind === "wiki" && e.id !== excludeId && normalizeEntityNameKey(e.name) === key
  );
  if (wikiMatches.length === 1) {
    return {
      targetType: "wiki",
      targetId: wikiMatches[0]!.id,
      label: AUTO_REFERENCE_LABEL,
    };
  }

  const mapMatches = catalog.filter(
    (e) => e.kind === "map" && normalizeEntityNameKey(e.name) === key
  );
  if (mapMatches.length === 1) {
    return {
      targetType: "map",
      targetId: mapMatches[0]!.id,
      label: AUTO_REFERENCE_LABEL,
    };
  }

  return null;
}

/**
 * Estrae riferimenti a voci wiki o mappe dal testo narrativo.
 * Sintassi supportata:
 * - [[Nome Voce]] o [[Nome Voce|testo]]
 * - [[mappa:Nome Mappa]]
 * - @Nome Voce (match sul catalogo, nome più lungo prima)
 */
export function extractEntityReferencesFromText(
  text: string,
  catalog: WikiCatalogEntry[],
  excludeEntityId?: string
): ParsedEntityReference[] {
  if (!text.trim() || !catalog.length) return [];

  const found = new Map<string, ParsedEntityReference>();

  const add = (ref: ParsedEntityReference | null) => {
    if (!ref || ref.targetId === excludeEntityId) return;
    const k = `${ref.targetType}:${ref.targetId}`;
    if (!found.has(k)) found.set(k, ref);
  };

  const wikiLinkRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = wikiLinkRe.exec(text)) !== null) {
    const inner = m[1]!.trim();
    if (/^mappa\s*:/i.test(inner)) {
      add(resolveCatalogName(inner.replace(/^mappa\s*:/i, "").trim(), catalog, excludeEntityId));
    } else {
      add(resolveCatalogName(inner, catalog, excludeEntityId));
    }
  }

  const mentionRe = /@([^\s@,;:!?\]]{2,80})/g;
  while ((m = mentionRe.exec(text)) !== null) {
    const fragment = m[1]!.trim();
    const sorted = [...catalog].sort((a, b) => b.name.length - a.name.length);
    for (const entry of sorted) {
      if (entry.kind === "wiki" && entry.id === excludeEntityId) continue;
      const nameKey = normalizeEntityNameKey(entry.name);
      const fragKey = normalizeEntityNameKey(fragment);
      if (fragKey === nameKey || fragKey.startsWith(`${nameKey} `)) {
        add({
          targetType: entry.kind === "map" ? "map" : "wiki",
          targetId: entry.id,
          label: AUTO_REFERENCE_LABEL,
        });
        break;
      }
    }
  }

  const sortedByName = [...catalog]
    .filter((e) => e.kind !== "wiki" || e.id !== excludeEntityId)
    .sort((a, b) => b.name.length - a.name.length);

  for (const entry of sortedByName) {
    const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(`(?<![\\w/\\[])${escaped}(?![\\w\\]])`, "gi");
    if (nameRe.test(text)) {
      add({
        targetType: entry.kind === "map" ? "map" : "wiki",
        targetId: entry.id,
        label: AUTO_REFERENCE_LABEL,
      });
    }
  }

  return [...found.values()];
}

export function mergeManualAndTextRelations(
  manual: Array<{ targetType: "wiki" | "map"; targetId: string; label: string }>,
  fromText: ParsedEntityReference[]
): Array<{ targetType: "wiki" | "map"; targetId: string; label: string }> {
  const byKey = new Map<string, { targetType: "wiki" | "map"; targetId: string; label: string }>();
  for (const ref of fromText) {
    byKey.set(`${ref.targetType}:${ref.targetId}`, ref);
  }
  for (const rel of manual) {
    byKey.set(`${rel.targetType}:${rel.targetId}`, rel);
  }
  return [...byKey.values()];
}

/** Raccoglie testo narrativo pubblico da body + attributi non riservati. */
export function collectNarrativeTexts(
  content: string,
  attributes: Record<string, unknown>
): string[] {
  const parts: string[] = [];
  if (content.trim()) parts.push(content);

  const keys = ["summary", "description", "history", "backstory"];
  for (const key of keys) {
    const v = attributes[key];
    if (typeof v === "string" && v.trim()) parts.push(v);
  }

  return parts;
}
