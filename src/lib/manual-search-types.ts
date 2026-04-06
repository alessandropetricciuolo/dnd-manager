export type ManualSearchHit = {
  content: string;
  similarity: number | null;
  sectionTitle: string | null;
  sourceLabel: string | null;
  fileName: string | null;
  chunkIndex: number | null;
  chapter: string | null;
  chunkType: string | null;
  /** Es. `eberron`, `tasha`, `xanathar` — supplement oltre il manuale base. */
  originTag: string | null;
};

export type ManualSearchMode = "phrase-focus" | "semantic" | "text-fallback";

/** Filtro corpus per test confronto .txt vs Markdown. */
export type ManualSourceFilter = "all" | "markdown" | "txt";

export type ManualSearchCompareSide = {
  primaryText: string;
  fileHint: string | null;
};

export type ManualSearchResult =
  | {
      success: true;
      mode: ManualSearchMode;
      primaryText: string;
      hits: ManualSearchHit[];
      sourceFilter: ManualSourceFilter;
      /** Solo con `sourceFilter === "all"`: miglior hit per fonte (stesso score frase / pool). */
      compare?: {
        markdown: ManualSearchCompareSide | null;
        txt: ManualSearchCompareSide | null;
      };
    }
  | { success: false; message: string };
