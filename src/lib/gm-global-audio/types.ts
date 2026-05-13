export type GmGlobalAudioType = "music" | "sfx" | "atmosphere";

export type GmGlobalAudioRow = {
  id: string;
  title: string;
  audio_type: GmGlobalAudioType;
  mood: string;
  storage_key: string;
  public_url: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};
