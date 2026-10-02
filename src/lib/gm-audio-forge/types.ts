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
  version: 2;
  categories: GmAudioCategory[];
  /** Pad SFX 12 tasti (icone + URL) per campagna. */
  sfxPad: SfxPadConfig;
};

export const GM_AUDIO_FORGE_LIBRARY_VERSION = 2 as const;

export type SfxPadSlot = {
  /** Indice fisso 0..11 */
  slotIndex: number;
  /** Nome icona Lucide (vedi sfx-pad-icons). */
  iconKey: string;
  etichetta: string;
  /** URL HTTPS del suono; vuoto = tasto muto. */
  trackUrl: string;
  /**
   * Se il suono è stato scelto dal menu libreria: `${categoryId}|${trackId}`.
   * Serve perché più tracce possono condividere lo stesso URL (es. proxy catalogo); il Select non può usare l’URL come value duplicato.
   */
  libraryRef?: string;
};

export type SfxPadConfig = {
  slots: SfxPadSlot[];
};

export function createDefaultSfxPad(): SfxPadConfig {
  const slots: SfxPadSlot[] = [];
  const icons = [
    "Bell",
    "Skull",
    "Flame",
    "Zap",
    "Volume2",
    "Wind",
    "CloudRain",
    "Swords",
    "Shield",
    "Footprints",
    "Moon",
    "Sparkles",
  ] as const;
  for (let i = 0; i < 12; i++) {
    slots.push({
      slotIndex: i,
      iconKey: icons[i] ?? "Bell",
      etichetta: `Tasto ${i + 1}`,
      trackUrl: "",
    });
  }
  return { slots };
}

export function createDefaultLibrary(): GmAudioForgeLibrary {
  return {
    version: GM_AUDIO_FORGE_LIBRARY_VERSION,
    categories: [],
    sfxPad: createDefaultSfxPad(),
  };
}
