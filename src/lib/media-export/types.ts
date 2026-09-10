export type ImageExportRecord = {
  /** Cartella nello ZIP, es. campaigns, wiki_entities */
  source: string;
  id: string;
  /** Nome file-friendly */
  label: string;
  imageUrl: string | null;
  telegramFallbackId: string | null;
};

export type CollectImagesOptions = {
  campaignId?: string | null;
  /** Service-role exports are non-Admin by default; routes must opt in only after verified Admin auth. */
  includeAdminOnly?: boolean;
};
