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
};
