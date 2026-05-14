import {
  createDefaultLibrary,
  createDefaultSfxPad,
  GM_AUDIO_FORGE_LIBRARY_VERSION,
  type GmAudioCategory,
  type GmAudioForgeLibrary,
  type SfxPadConfig,
  type SfxPadSlot,
} from "./types";

const STORAGE_PREFIX = "bd-gm-audio-forge:";

function storageKey(campaignId: string): string {
  return `${STORAGE_PREFIX}${campaignId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCategory(raw: unknown): GmAudioCategory | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : null;
  const name = typeof raw.name === "string" ? raw.name : null;
  const kind = raw.kind === "music" || raw.kind === "atmosphere" || raw.kind === "sfx" ? raw.kind : null;
  if (!id || !name || !kind) return null;
  const playbackMode =
    raw.playbackMode === "shuffle" || raw.playbackMode === "loop_one" ? raw.playbackMode : "shuffle";
  const sfxBackgroundRepeat = typeof raw.sfxBackgroundRepeat === "boolean" ? raw.sfxBackgroundRepeat : false;
  const sfxRepeatGapMinMs =
    typeof raw.sfxRepeatGapMinMs === "number" && Number.isFinite(raw.sfxRepeatGapMinMs)
      ? Math.max(0, Math.min(raw.sfxRepeatGapMinMs, 120_000))
      : 2000;
  const sfxRepeatGapMaxMs =
    typeof raw.sfxRepeatGapMaxMs === "number" && Number.isFinite(raw.sfxRepeatGapMaxMs)
      ? Math.max(0, Math.min(raw.sfxRepeatGapMaxMs, 300_000))
      : 12_000;
  const tracksIn = Array.isArray(raw.tracks) ? raw.tracks : [];
  const tracks: GmAudioCategory["tracks"] = [];
  for (const t of tracksIn) {
    if (!isRecord(t)) continue;
    const tid = typeof t.id === "string" ? t.id : null;
    const label = typeof t.label === "string" ? t.label : null;
    const url = typeof t.url === "string" ? t.url : null;
    if (tid && label && url) tracks.push({ id: tid, label, url });
  }
  let gapMin = sfxRepeatGapMinMs;
  let gapMax = sfxRepeatGapMaxMs;
  if (gapMin > gapMax) {
    const t = gapMin;
    gapMin = gapMax;
    gapMax = t;
  }
  return {
    id,
    name,
    kind,
    playbackMode,
    sfxBackgroundRepeat,
    sfxRepeatGapMinMs: gapMin,
    sfxRepeatGapMaxMs: gapMax,
    tracks,
  };
}

function parseSfxPad(raw: unknown): SfxPadConfig | null {
  if (!isRecord(raw)) return null;
  const slotsIn = Array.isArray(raw.slots) ? raw.slots : [];
  const byIndex = new Map<number, SfxPadSlot>();
  for (const s of slotsIn) {
    if (!isRecord(s)) continue;
    const idx =
      typeof s.slotIndex === "number" && Number.isInteger(s.slotIndex) && s.slotIndex >= 0 && s.slotIndex < 12
        ? s.slotIndex
        : null;
    if (idx === null) continue;
    const iconKey = typeof s.iconKey === "string" && s.iconKey.trim() ? s.iconKey.trim() : "Bell";
    const etichetta = typeof s.etichetta === "string" ? s.etichetta : "";
    const trackUrl = typeof s.trackUrl === "string" ? s.trackUrl : "";
    const libraryRefRaw = (s as Record<string, unknown>).libraryRef;
    const libraryRef =
      typeof libraryRefRaw === "string" && libraryRefRaw.includes("|") && libraryRefRaw.trim().length > 2
        ? libraryRefRaw.trim()
        : undefined;
    byIndex.set(idx, { slotIndex: idx, iconKey, etichetta, trackUrl, ...(libraryRef ? { libraryRef } : {}) });
  }
  if (byIndex.size === 0) return null;
  const def = createDefaultSfxPad();
  const slots: SfxPadSlot[] = [];
  for (let i = 0; i < 12; i++) {
    slots.push(byIndex.get(i) ?? def.slots[i]!);
  }
  return { slots };
}

function parseCategories(parsed: Record<string, unknown>): GmAudioCategory[] {
  const catsIn = Array.isArray(parsed.categories) ? parsed.categories : [];
  const categories: GmAudioCategory[] = [];
  for (const c of catsIn) {
    const cat = parseCategory(c);
    if (cat) categories.push(cat);
  }
  return categories;
}

export function loadGmAudioForgeLibrary(campaignId: string): GmAudioForgeLibrary {
  if (typeof window === "undefined") return createDefaultLibrary();
  try {
    const raw = window.localStorage.getItem(storageKey(campaignId));
    if (!raw) return createDefaultLibrary();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createDefaultLibrary();

    const ver = parsed.version;
    const categories = parseCategories(parsed);

    if (ver === 1) {
      return {
        version: GM_AUDIO_FORGE_LIBRARY_VERSION,
        categories,
        sfxPad: createDefaultSfxPad(),
      };
    }

    if (ver !== 2) return createDefaultLibrary();

    const sfxPad = parseSfxPad(parsed.sfxPad) ?? createDefaultSfxPad();
    return {
      version: GM_AUDIO_FORGE_LIBRARY_VERSION,
      categories,
      sfxPad,
    };
  } catch {
    return createDefaultLibrary();
  }
}

export function saveGmAudioForgeLibrary(campaignId: string, library: GmAudioForgeLibrary): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(campaignId), JSON.stringify(library));
  } catch {
    // quota piena o modalità privata: ignorare senza rompere la GM screen
  }
}
