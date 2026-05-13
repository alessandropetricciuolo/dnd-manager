import {
  createDefaultLibrary,
  GM_AUDIO_FORGE_LIBRARY_VERSION,
  type GmAudioCategory,
  type GmAudioForgeLibrary,
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

export function loadGmAudioForgeLibrary(campaignId: string): GmAudioForgeLibrary {
  if (typeof window === "undefined") return createDefaultLibrary();
  try {
    const raw = window.localStorage.getItem(storageKey(campaignId));
    if (!raw) return createDefaultLibrary();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createDefaultLibrary();
    if (parsed.version !== GM_AUDIO_FORGE_LIBRARY_VERSION) return createDefaultLibrary();
    const catsIn = Array.isArray(parsed.categories) ? parsed.categories : [];
    const categories: GmAudioCategory[] = [];
    for (const c of catsIn) {
      const cat = parseCategory(c);
      if (cat) categories.push(cat);
    }
    return { version: GM_AUDIO_FORGE_LIBRARY_VERSION, categories };
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
