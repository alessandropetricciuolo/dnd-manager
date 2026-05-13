export type GmAudioTrack = {
  id: string;
  label: string;
  url: string;
};

export type GmAudioCategoryKind = "music" | "atmosphere" | "sfx";

/** Come [Audio Forge](https://slashpaf.com/it/audioforge/doc/toolbox/): shuffle tra brani oppure loop di un singolo file. */
export type GmAudioPlaybackMode = "shuffle" | "loop_one";

export type GmAudioCategory = {
  id: string;
  name: string;
  kind: GmAudioCategoryKind;
  playbackMode: GmAudioPlaybackMode;
  /** Solo categoria SFX: ripetizione casuale in sottofondo (stile Echi tenuto premuto). */
  sfxBackgroundRepeat: boolean;
  sfxRepeatGapMinMs: number;
  sfxRepeatGapMaxMs: number;
  tracks: GmAudioTrack[];
};

export type GmAudioForgeLibrary = {
  version: 1;
  categories: GmAudioCategory[];
};

export const GM_AUDIO_FORGE_LIBRARY_VERSION = 1 as const;

export function createDefaultLibrary(): GmAudioForgeLibrary {
  return { version: GM_AUDIO_FORGE_LIBRARY_VERSION, categories: [] };
}
