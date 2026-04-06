export type CompendioMdSearchResult =
  | {
      success: true;
      mode: "heading" | "phrase";
      sectionTitle: string | null;
      excerpt: string;
      fileName: string;
    }
  | { success: false; message: string };
