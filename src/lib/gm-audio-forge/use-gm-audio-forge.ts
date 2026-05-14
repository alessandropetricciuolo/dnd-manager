"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { loadGmAudioForgeLibrary, saveGmAudioForgeLibrary } from "./storage";
import {
  createDefaultLibrary,
  type GmAudioCategory,
  type GmAudioForgeLibrary,
  type GmAudioTrack,
} from "./types";
import { isAllowedAudioUrl } from "./url-validation";

export function newGmAudioEntityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pickRandomTrack(tracks: GmAudioTrack[], excludeUrl?: string | null): GmAudioTrack | null {
  if (tracks.length === 0) return null;
  if (tracks.length === 1) return tracks[0] ?? null;
  const candidates = excludeUrl ? tracks.filter((t) => t.url !== excludeUrl) : tracks;
  const pool = candidates.length > 0 ? candidates : tracks;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function getCategory(lib: GmAudioForgeLibrary, id: string): GmAudioCategory | undefined {
  return lib.categories.find((c) => c.id === id);
}

function clampVolume(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function useGmAudioForge(campaignId: string) {
  const [library, setLibrary] = useState<GmAudioForgeLibrary>(() => createDefaultLibrary());
  const libraryRef = useRef(library);
  libraryRef.current = library;

  const [activeMusicCategoryId, setActiveMusicCategoryId] = useState<string | null>(null);
  const [activeAtmosphereIds, setActiveAtmosphereIds] = useState<Record<string, boolean>>({});
  const [musicMaster, setMusicMaster] = useState(0.75);
  const [atmosMaster, setAtmosMaster] = useState(0.65);
  const [sfxMaster, setSfxMaster] = useState(0.9);

  const musicMasterRef = useRef(musicMaster);
  const atmosMasterRef = useRef(atmosMaster);
  const sfxMasterRef = useRef(sfxMaster);
  musicMasterRef.current = musicMaster;
  atmosMasterRef.current = atmosMaster;
  sfxMasterRef.current = sfxMaster;

  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicStateRef = useRef<{ categoryId: string; trackUrl: string } | null>(null);
  const lastPositiveMusicMasterRef = useRef(0.75);

  const atmosAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const atmosStateRef = useRef<Map<string, { trackUrl: string }>>(new Map());

  const sfxTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sfxPlayingRef = useRef<Set<HTMLAudioElement>>(new Set());
  /** Categorie SFX con ripetizione casuale attiva (toggle Echi). */
  const sfxBackgroundArmedRef = useRef<Set<string>>(new Set());
  const [sfxBackgroundUiTick, setSfxBackgroundUiTick] = useState(0);

  const activeAtmosphereIdsRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    activeAtmosphereIdsRef.current = activeAtmosphereIds;
  }, [activeAtmosphereIds]);

  const stopMusicInternal = useCallback(() => {
    const a = musicAudioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    musicStateRef.current = null;
    setActiveMusicCategoryId(null);
  }, []);

  const stopAtmosphereInternal = useCallback((categoryId: string) => {
    const a = atmosAudiosRef.current.get(categoryId);
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
      atmosAudiosRef.current.delete(categoryId);
    }
    atmosStateRef.current.delete(categoryId);
    setActiveAtmosphereIds((prev) => {
      if (!prev[categoryId]) return prev;
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  }, []);

  const stopAllSfxBackground = useCallback(() => {
    sfxBackgroundArmedRef.current.clear();
    setSfxBackgroundUiTick((n) => n + 1);
    for (const t of sfxTimeoutsRef.current.values()) {
      clearTimeout(t);
    }
    sfxTimeoutsRef.current.clear();
    for (const a of sfxPlayingRef.current) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }
    sfxPlayingRef.current.clear();
  }, []);

  const stopAllAtmospheresInternal = useCallback(() => {
    for (const id of [...atmosAudiosRef.current.keys()]) {
      stopAtmosphereInternal(id);
    }
  }, [stopAtmosphereInternal]);

  const playMusicTrack = useCallback(
    (categoryId: string, track: GmAudioTrack) => {
      const url = track.url?.trim() ?? "";
      if (!url) {
        toast.error("Traccia senza URL.");
        return;
      }
      if (!isAllowedAudioUrl(url)) {
        toast.error("URL audio non valido: serve HTTPS (o path /… su questo sito).");
        return;
      }
      let a = musicAudioRef.current;
      if (!a) {
        a = new Audio();
        a.preload = "auto";
        musicAudioRef.current = a;
        const onEnded = () => {
          const el = musicAudioRef.current;
          const lib = libraryRef.current;
          const st = musicStateRef.current;
          if (!st || !el) return;
          const cat = getCategory(lib, st.categoryId);
          if (!cat || cat.kind !== "music") return;
          if (cat.tracks.length === 0) {
            stopMusicInternal();
            return;
          }
          if (cat.playbackMode === "loop_one") {
            return;
          }
          const next = pickRandomTrack(cat.tracks, st.trackUrl);
          if (!next) {
            stopMusicInternal();
            return;
          }
          musicStateRef.current = { categoryId: st.categoryId, trackUrl: next.url };
          el.loop = false;
          el.volume = clampVolume(musicMasterRef.current);
          el.src = next.url;
          void el.play().catch(() => {});
        };
        a.addEventListener("ended", onEnded);
      }
      musicStateRef.current = { categoryId, trackUrl: url };
      const catNow = getCategory(libraryRef.current, categoryId);
      a.loop = catNow?.playbackMode === "loop_one";
      a.volume = clampVolume(musicMasterRef.current);
      a.src = url;
      void a.play().catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") {
          toast.error("Riproduzione bloccata: interagisci di nuovo con la pagina (clic) e riprova.");
        } else {
          toast.error("Impossibile avviare la musica (rete, formato o permessi del browser).");
        }
      });
    },
    [stopMusicInternal]
  );

  const playAtmosphereTrack = useCallback(
    (categoryId: string, track: GmAudioTrack) => {
      const url = track.url?.trim() ?? "";
      if (!url) {
        toast.error("Traccia senza URL.");
        return;
      }
      if (!isAllowedAudioUrl(url)) {
        toast.error("URL atmosfera non valido: serve HTTPS (o path /… su questo sito).");
        return;
      }
      let a = atmosAudiosRef.current.get(categoryId);
      if (!a) {
        a = new Audio();
        a.preload = "auto";
        atmosAudiosRef.current.set(categoryId, a);
        const onEnded = () => {
          const el = atmosAudiosRef.current.get(categoryId);
          const lib = libraryRef.current;
          const st = atmosStateRef.current.get(categoryId);
          if (!st || !el) return;
          const cat = getCategory(lib, categoryId);
          if (!cat || cat.kind !== "atmosphere") return;
          if (cat.tracks.length === 0) {
            stopAtmosphereInternal(categoryId);
            return;
          }
          if (cat.playbackMode === "loop_one") {
            return;
          }
          const next = pickRandomTrack(cat.tracks, st.trackUrl);
          if (!next) {
            stopAtmosphereInternal(categoryId);
            return;
          }
          atmosStateRef.current.set(categoryId, { trackUrl: next.url });
          el.loop = false;
          el.volume = clampVolume(atmosMasterRef.current);
          el.src = next.url;
          void el.play().catch(() => {});
        };
        a.addEventListener("ended", onEnded);
      }
      atmosStateRef.current.set(categoryId, { trackUrl: url });
      const catNow = getCategory(libraryRef.current, categoryId);
      a.loop = catNow?.playbackMode === "loop_one";
      a.volume = clampVolume(atmosMasterRef.current);
      a.src = url;
      void a.play().catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") {
          toast.error("Atmosfera: clic di nuovo sulla pagina e riprova.");
        } else {
          toast.error("Impossibile avviare l’atmosfera (rete o formato).");
        }
      });
    },
    [stopAtmosphereInternal]
  );

  useEffect(() => {
    setLibrary(loadGmAudioForgeLibrary(campaignId));
    stopMusicInternal();
    stopAllAtmospheresInternal();
    stopAllSfxBackground();
  }, [campaignId, stopAllAtmospheresInternal, stopAllSfxBackground, stopMusicInternal]);

  useEffect(() => {
    saveGmAudioForgeLibrary(campaignId, library);
  }, [campaignId, library]);

  useEffect(() => {
    return () => {
      stopMusicInternal();
      stopAllAtmospheresInternal();
      stopAllSfxBackground();
      const a = musicAudioRef.current;
      if (a) {
        a.pause();
        musicAudioRef.current = null;
      }
    };
  }, [stopAllAtmospheresInternal, stopAllSfxBackground, stopMusicInternal]);

  const toggleMusicCategory = useCallback(
    (categoryId: string) => {
      const cat = getCategory(libraryRef.current, categoryId);
      if (!cat || cat.kind !== "music") return;
      if (cat.tracks.length === 0) return;
      if (musicStateRef.current?.categoryId === categoryId) {
        stopMusicInternal();
        return;
      }
      setActiveMusicCategoryId(categoryId);
      const first =
        cat.playbackMode === "loop_one"
          ? pickRandomTrack(cat.tracks, null)
          : pickRandomTrack(cat.tracks, null);
      if (!first) {
        toast.error("Nessuna traccia riproducibile in questa categoria.");
        return;
      }
      playMusicTrack(categoryId, first);
    },
    [playMusicTrack, stopMusicInternal]
  );

  const toggleAtmosphereCategory = useCallback(
    (categoryId: string) => {
      const cat = getCategory(libraryRef.current, categoryId);
      if (!cat || cat.kind !== "atmosphere") return;
      if (cat.tracks.length === 0) return;
      if (activeAtmosphereIdsRef.current[categoryId]) {
        stopAtmosphereInternal(categoryId);
        return;
      }
      setActiveAtmosphereIds((prev) => ({ ...prev, [categoryId]: true }));
      const first = pickRandomTrack(cat.tracks, null);
      if (!first) return;
      playAtmosphereTrack(categoryId, first);
    },
    [playAtmosphereTrack, stopAtmosphereInternal]
  );

  const playSfxRandom = useCallback(
    (categoryId: string) => {
      const cat = getCategory(libraryRef.current, categoryId);
      if (!cat || cat.kind !== "sfx") return;
      if (cat.tracks.length === 0) return;
      const track = pickRandomTrack(cat.tracks, null);
      if (!track) return;
      const a = new Audio(track.url);
      a.volume = clampVolume(sfxMasterRef.current);
      sfxPlayingRef.current.add(a);
      void a.play().catch(() => {});
      a.addEventListener(
        "ended",
        () => {
          sfxPlayingRef.current.delete(a);
        },
        { once: true }
      );
    },
    []
  );

  const playSfxUrl = useCallback(
    (url: string) => {
      const u = url.trim();
      if (!u || !isAllowedAudioUrl(u)) return;
      const a = new Audio(u);
      a.volume = clampVolume(sfxMasterRef.current);
      sfxPlayingRef.current.add(a);
      void a.play().catch(() => {});
      a.addEventListener(
        "ended",
        () => {
          sfxPlayingRef.current.delete(a);
        },
        { once: true }
      );
    },
    []
  );

  const scheduleNextSfxBackground = useCallback(
    (categoryId: string) => {
      const existing = sfxTimeoutsRef.current.get(categoryId);
      if (existing) clearTimeout(existing);
      const cat = getCategory(libraryRef.current, categoryId);
      if (
        !cat ||
        cat.kind !== "sfx" ||
        !cat.sfxBackgroundRepeat ||
        !sfxBackgroundArmedRef.current.has(categoryId) ||
        cat.tracks.length === 0
      ) {
        sfxTimeoutsRef.current.delete(categoryId);
        return;
      }
      const min = Math.min(cat.sfxRepeatGapMinMs, cat.sfxRepeatGapMaxMs);
      const max = Math.max(cat.sfxRepeatGapMinMs, cat.sfxRepeatGapMaxMs);
      const delay = min + Math.random() * (max - min || 1);
      const t = setTimeout(() => {
        sfxTimeoutsRef.current.delete(categoryId);
        const c2 = getCategory(libraryRef.current, categoryId);
        if (!c2 || c2.kind !== "sfx" || !c2.sfxBackgroundRepeat || !sfxBackgroundArmedRef.current.has(categoryId))
          return;
        const track = pickRandomTrack(c2.tracks, null);
        if (!track) return;
        const a = new Audio(track.url);
        a.volume = clampVolume(sfxMasterRef.current);
        sfxPlayingRef.current.add(a);
        void a.play().catch(() => {});
        a.addEventListener(
          "ended",
          () => {
            sfxPlayingRef.current.delete(a);
            if (sfxBackgroundArmedRef.current.has(categoryId)) {
              scheduleNextSfxBackground(categoryId);
            }
          },
          { once: true }
        );
      }, delay);
      sfxTimeoutsRef.current.set(categoryId, t);
    },
    []
  );

  const toggleSfxBackground = useCallback(
    (categoryId: string) => {
      const cat = getCategory(libraryRef.current, categoryId);
      if (!cat || cat.kind !== "sfx") return;
      if (!cat.sfxBackgroundRepeat) return;
      if (sfxBackgroundArmedRef.current.has(categoryId)) {
        sfxBackgroundArmedRef.current.delete(categoryId);
        setSfxBackgroundUiTick((n) => n + 1);
        const existing = sfxTimeoutsRef.current.get(categoryId);
        if (existing) {
          clearTimeout(existing);
          sfxTimeoutsRef.current.delete(categoryId);
        }
        return;
      }
      if (cat.tracks.length === 0) return;
      sfxBackgroundArmedRef.current.add(categoryId);
      setSfxBackgroundUiTick((n) => n + 1);
      const track = pickRandomTrack(cat.tracks, null);
      if (!track) {
        sfxBackgroundArmedRef.current.delete(categoryId);
        return;
      }
      const a = new Audio(track.url);
      a.volume = clampVolume(sfxMasterRef.current);
      sfxPlayingRef.current.add(a);
      void a.play().catch(() => {});
      a.addEventListener(
        "ended",
        () => {
          sfxPlayingRef.current.delete(a);
          if (sfxBackgroundArmedRef.current.has(categoryId)) {
            scheduleNextSfxBackground(categoryId);
          }
        },
        { once: true }
      );
    },
    [scheduleNextSfxBackground]
  );

  const stopAll = useCallback(() => {
    stopMusicInternal();
    stopAllAtmospheresInternal();
    stopAllSfxBackground();
  }, [stopAllAtmospheresInternal, stopAllSfxBackground, stopMusicInternal]);

  const toggleMusicPlayback = useCallback(() => {
    const a = musicAudioRef.current;
    const st = musicStateRef.current;
    if (!a || !st) return;
    if (a.paused) {
      a.volume = clampVolume(musicMasterRef.current);
      void a.play().catch(() => {});
    } else a.pause();
  }, []);

  const skipMusicTrack = useCallback(
    (direction: 1 | -1) => {
      const st = musicStateRef.current;
      if (!st) return;
      const cat = getCategory(libraryRef.current, st.categoryId);
      if (!cat || cat.kind !== "music" || cat.tracks.length === 0) return;
      if (cat.playbackMode === "loop_one") {
        const t = cat.tracks.find((tr) => tr.url === st.trackUrl) ?? cat.tracks[0];
        if (t) playMusicTrack(st.categoryId, t);
        return;
      }
      const ix = cat.tracks.findIndex((tr) => tr.url === st.trackUrl);
      const len = cat.tracks.length;
      const base = ix >= 0 ? ix : 0;
      const nextIx = (base + direction + len * 10) % len;
      const next = cat.tracks[nextIx];
      if (next) playMusicTrack(st.categoryId, next);
    },
    [playMusicTrack]
  );

  const playMusicByTrackId = useCallback(
    (categoryId: string, trackId: string) => {
      const cat = getCategory(libraryRef.current, categoryId);
      if (!cat || cat.kind !== "music") return;
      const track = cat.tracks.find((t) => t.id === trackId);
      if (!track) return;
      setActiveMusicCategoryId(categoryId);
      playMusicTrack(categoryId, track);
    },
    [playMusicTrack]
  );

  const setMusicMuted = useCallback((muted: boolean) => {
    if (muted) {
      setMusicMaster(0);
    } else {
      setMusicMaster(clampVolume(lastPositiveMusicMasterRef.current || 0.75));
    }
  }, []);

  useEffect(() => {
    if (musicMaster > 0.001) lastPositiveMusicMasterRef.current = musicMaster;
  }, [musicMaster]);

  useEffect(() => {
    const m = clampVolume(musicMaster);
    const a = musicAudioRef.current;
    if (a) a.volume = m;
  }, [musicMaster, activeMusicCategoryId]);

  useEffect(() => {
    const m = clampVolume(atmosMaster);
    for (const a of atmosAudiosRef.current.values()) {
      a.volume = m;
    }
  }, [atmosMaster, activeAtmosphereIds]);

  useEffect(() => {
    const v = clampVolume(sfxMaster);
    for (const a of sfxPlayingRef.current) {
      a.volume = v;
    }
  }, [sfxMaster]);

  useEffect(() => {
    // Rimuovi atmosfere se la categoria è stata cancellata dal library
    const ids = new Set(library.categories.filter((c) => c.kind === "atmosphere").map((c) => c.id));
    for (const id of Object.keys(activeAtmosphereIds)) {
      if (!ids.has(id)) stopAtmosphereInternal(id);
    }
    const musicStill =
      activeMusicCategoryId && library.categories.some((c) => c.id === activeMusicCategoryId && c.kind === "music");
    if (activeMusicCategoryId && !musicStill) stopMusicInternal();
  }, [
    library.categories,
    activeAtmosphereIds,
    activeMusicCategoryId,
    stopAtmosphereInternal,
    stopMusicInternal,
  ]);

  const sfxBackgroundArmedIds = useMemo(() => {
    void sfxBackgroundUiTick;
    return Array.from(sfxBackgroundArmedRef.current);
  }, [sfxBackgroundUiTick]);

  return {
    library,
    setLibrary,
    activeMusicCategoryId,
    activeAtmosphereIds,
    musicMaster,
    setMusicMaster,
    atmosMaster,
    setAtmosMaster,
    sfxMaster,
    setSfxMaster,
    toggleMusicCategory,
    toggleAtmosphereCategory,
    playSfxRandom,
    playSfxUrl,
    toggleSfxBackground,
    stopAll,
    toggleMusicPlayback,
    skipMusicTrack,
    playMusicByTrackId,
    setMusicMuted,
    isAllowedAudioUrl,
    sfxBackgroundArmedIds,
  };
}

export type GmAudioForgeControls = ReturnType<typeof useGmAudioForge>;
