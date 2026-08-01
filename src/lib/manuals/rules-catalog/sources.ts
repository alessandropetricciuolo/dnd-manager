import fs from "fs";
import path from "path";

export type RulesCatalogSourceId =
  | "player_handbook"
  | "xanathars_guide"
  | "tashas_cauldron"
  | "eberron"
  | "dungeon_masters_guide";

export type RulesCatalogSource = {
  id: RulesCatalogSourceId;
  sourceBook: string;
  sourceFile: string;
  sourceLabel: string;
};

/** Manuali in scope catalogo v2. */
export const RULES_CATALOG_SOURCES: Record<RulesCatalogSourceId, RulesCatalogSource> = {
  player_handbook: {
    id: "player_handbook",
    sourceBook: "player_handbook",
    sourceFile: "manuale_giocatore.md",
    sourceLabel: "Manuale del Giocatore",
  },
  xanathars_guide: {
    id: "xanathars_guide",
    sourceBook: "xanathars_guide",
    sourceFile: "xanathar.md",
    sourceLabel: "Guida di Xanathar a Ogni Cosa",
  },
  tashas_cauldron: {
    id: "tashas_cauldron",
    sourceBook: "tashas_cauldron",
    sourceFile: "Tasha.md",
    sourceLabel: "Calderone di Tasha di Ogni Cosa",
  },
  eberron: {
    id: "eberron",
    sourceBook: "eberron",
    sourceFile: "eberron.md",
    sourceLabel: "Eberron: Rising from the Last War",
  },
  dungeon_masters_guide: {
    id: "dungeon_masters_guide",
    sourceBook: "dungeon_masters_guide",
    sourceFile: "DM_5th_master.md",
    sourceLabel: "Guida del Dungeon Master",
  },
};

/** Libri da cui estrarre schede incantesimo (`kind: spell`). */
export const SPELL_CATALOG_SOURCE_IDS: RulesCatalogSourceId[] = [
  "player_handbook",
  "xanathars_guide",
  "tashas_cauldron",
  "eberron",
];

/** Priorità lookup quando lo stesso slug/nome esiste in più libri (più basso = preferito). */
export const SOURCE_BOOK_PRIORITY: Record<string, number> = {
  player_handbook: 0,
  xanathars_guide: 1,
  tashas_cauldron: 2,
  eberron: 3,
  dungeon_masters_guide: 4,
};

export function resolveManualMarkdownPath(sourceFile: string): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "manuals", sourceFile),
    path.join(cwd, "dnd-manager", "public", "manuals", sourceFile),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function readManualMarkdown(sourceFile: string): string {
  const p = resolveManualMarkdownPath(sourceFile);
  if (!p) throw new Error(`File non trovato: public/manuals/${sourceFile}`);
  return fs.readFileSync(p, "utf8");
}

export function getSourceById(id: RulesCatalogSourceId): RulesCatalogSource {
  return RULES_CATALOG_SOURCES[id];
}
