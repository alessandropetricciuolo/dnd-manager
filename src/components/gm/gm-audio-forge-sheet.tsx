"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Headphones, Plus, Trash2, Square } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { newGmAudioEntityId } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import type { GmAudioCategory, GmAudioCategoryKind, GmAudioPlaybackMode } from "@/lib/gm-audio-forge/types";
import { normalizeAudioUrl } from "@/lib/gm-audio-forge/url-validation";
import { GmGlobalAudioCatalog } from "./gm-global-audio-catalog";
import { GmSpotifyPlayerPanel } from "./gm-spotify-player-panel";
import { GmSfxPadPanel } from "./gm-sfx-pad-panel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forge: GmAudioForgeControls;
  spotifyEmbedPlaylistId: string | null;
  onSpotifyEmbedPlaylistIdChange: (spotifyPlaylistId: string) => void;
};

function createEmptyCategory(kind: GmAudioCategoryKind): GmAudioCategory {
  const base =
    kind === "music" ? "Musica" : kind === "atmosphere" ? "Atmosfera" : "Effetti";
  return {
    id: newGmAudioEntityId(),
    name: `${base} ${Math.floor(Math.random() * 900 + 100)}`,
    kind,
    playbackMode: "shuffle",
    sfxBackgroundRepeat: false,
    sfxRepeatGapMinMs: 2500,
    sfxRepeatGapMaxMs: 9000,
    tracks: [],
  };
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-amber-900/25 bg-zinc-900/40 p-4 shadow-sm ring-1 ring-black/20 sm:p-5",
        className
      )}
    >
      <header className="mb-4 flex flex-col gap-1 border-b border-amber-900/20 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-amber-50">{title}</h3>
          {description ? <p className="mt-1 max-w-prose text-xs leading-relaxed text-zinc-500">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function CategoryTile({
  name,
  active,
  onClick,
  disabled,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[5.25rem] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-medium transition-all duration-150",
        active
          ? "border-amber-400/90 bg-amber-600/20 text-amber-50 shadow-md shadow-amber-900/20 ring-2 ring-amber-500/25"
          : "border-amber-800/35 bg-zinc-950/60 text-zinc-300 hover:border-amber-600/50 hover:bg-zinc-800/70",
        disabled && "cursor-not-allowed border-zinc-800 opacity-45 hover:border-zinc-800 hover:bg-zinc-950/60"
      )}
    >
      <span className="line-clamp-2">{name}</span>
    </button>
  );
}

export function GmAudioForgeSheet({
  open,
  onOpenChange,
  forge,
  spotifyEmbedPlaylistId,
  onSpotifyEmbedPlaylistIdChange,
}: Props) {
  const {
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
    isAllowedAudioUrl,
    sfxBackgroundArmedIds,
  } = forge;

  const [newKind, setNewKind] = useState<GmAudioCategoryKind>("music");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTrackByCategory, setNewTrackByCategory] = useState<Record<string, { url: string; label: string }>>({});

  const musicCats = useMemo(() => library.categories.filter((c) => c.kind === "music"), [library.categories]);
  const atmosCats = useMemo(() => library.categories.filter((c) => c.kind === "atmosphere"), [library.categories]);
  const sfxCats = useMemo(() => library.categories.filter((c) => c.kind === "sfx"), [library.categories]);

  const getNewTrackFields = useCallback(
    (categoryId: string) =>
      newTrackByCategory[categoryId] ?? {
        url: "",
        label: "",
      },
    [newTrackByCategory]
  );

  const setNewTrackFields = useCallback((categoryId: string, patch: Partial<{ url: string; label: string }>) => {
    setNewTrackByCategory((prev) => {
      const cur = prev[categoryId] ?? { url: "", label: "" };
      return { ...prev, [categoryId]: { ...cur, ...patch } };
    });
  }, []);

  const addCategory = useCallback(() => {
    setLibrary((lib) => ({
      ...lib,
      categories: [...lib.categories, createEmptyCategory(newKind)],
    }));
    toast.success("Categoria aggiunta. Configurala qui sotto.");
  }, [newKind, setLibrary]);

  const removeCategory = useCallback(
    (id: string) => {
      setLibrary((lib) => ({
        ...lib,
        categories: lib.categories.filter((c) => c.id !== id),
      }));
      setExpandedId((e) => (e === id ? null : e));
      setNewTrackByCategory((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [setLibrary]
  );

  const patchCategory = useCallback(
    (id: string, patch: Partial<GmAudioCategory>) => {
      setLibrary((lib) => ({
        ...lib,
        categories: lib.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [setLibrary]
  );

  const addTrackToCategory = useCallback(
    (categoryId: string) => {
      const { url: rawUrl, label: rawLabel } = getNewTrackFields(categoryId);
      const url = normalizeAudioUrl(rawUrl);
      const label = rawLabel.trim() || "Traccia";
      if (!isAllowedAudioUrl(url)) {
        toast.error("URL non valido. Usa https://… oppure un path assoluto che inizi con /.");
        return;
      }
      setLibrary((lib) => ({
        ...lib,
        categories: lib.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                tracks: [...c.tracks, { id: newGmAudioEntityId(), label, url }],
              }
            : c
        ),
      }));
      setNewTrackFields(categoryId, { url: "", label: "" });
      toast.success("Traccia aggiunta.");
    },
    [getNewTrackFields, isAllowedAudioUrl, setLibrary, setNewTrackFields]
  );

  const removeTrack = useCallback(
    (categoryId: string, trackId: string) => {
      setLibrary((lib) => ({
        ...lib,
        categories: lib.categories.map((c) =>
          c.id === categoryId ? { ...c, tracks: c.tracks.filter((t) => t.id !== trackId) } : c
        ),
      }));
    },
    [setLibrary]
  );

  const emptyCatsHint = "Crea categorie nella sezione Libreria qui accanto.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-none flex-col border-l border-amber-600/25 bg-zinc-950 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-amber-800/30 bg-zinc-900/30 px-5 pb-4 pt-5 pr-14">
          <SheetTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight text-amber-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-700/40 bg-amber-950/40 text-amber-400">
              <Headphones className="h-5 w-5" />
            </span>
            Audio
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="mixer" className="flex min-h-0 flex-1 flex-col px-4 pb-5 pt-3 sm:px-5">
          <TabsList className="mb-4 grid h-11 w-full shrink-0 grid-cols-2 gap-1 rounded-xl border border-amber-900/35 bg-zinc-900 p-1 shadow-inner">
            <TabsTrigger
              value="mixer"
              className="rounded-lg text-sm font-medium text-zinc-400 transition-all data-[state=active]:bg-amber-600/25 data-[state=active]:text-amber-50 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-300"
            >
              Mixer
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="rounded-lg text-sm font-medium text-zinc-400 transition-all data-[state=active]:bg-amber-600/25 data-[state=active]:text-amber-50 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-300"
            >
              Libreria
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="mixer"
            forceMount
            className="mt-0 min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden pb-2 pr-0.5 data-[state=inactive]:hidden"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg border-red-800/50 text-red-300 hover:bg-red-950/40"
                onClick={() => {
                  stopAll();
                  toast.message("Tutto fermato.");
                }}
              >
                <Square className="mr-2 h-4 w-4" />
                Stop tutto
              </Button>
            </div>

            <SectionCard title="Volume" description="Controlli master indipendenti per musica, atmosfere ed effetti.">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-amber-200/90">Musica</Label>
                  <Slider
                    value={[musicMaster * 100]}
                    max={100}
                    step={1}
                    onValueChange={(v) => setMusicMaster((v[0] ?? 0) / 100)}
                    className="py-1"
                  />
                  <p className="text-right text-[11px] tabular-nums text-zinc-500">{Math.round(musicMaster * 100)}%</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-amber-200/90">Atmosfere</Label>
                  <Slider
                    value={[atmosMaster * 100]}
                    max={100}
                    step={1}
                    onValueChange={(v) => setAtmosMaster((v[0] ?? 0) / 100)}
                    className="py-1"
                  />
                  <p className="text-right text-[11px] tabular-nums text-zinc-500">{Math.round(atmosMaster * 100)}%</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-amber-200/90">SFX</Label>
                  <Slider
                    value={[sfxMaster * 100]}
                    max={100}
                    step={1}
                    onValueChange={(v) => setSfxMaster((v[0] ?? 0) / 100)}
                    className="py-1"
                  />
                  <p className="text-right text-[11px] tabular-nums text-zinc-500">{Math.round(sfxMaster * 100)}%</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Musica" description="Una sola categoria attiva. Tocco = play, stesso tocco = stop.">
              {musicCats.length === 0 ? (
                <p className="text-sm text-zinc-500">{emptyCatsHint}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {musicCats.map((c) => (
                    <CategoryTile
                      key={c.id}
                      name={c.name}
                      active={activeMusicCategoryId === c.id}
                      disabled={c.tracks.length === 0}
                      onClick={() => {
                        if (c.tracks.length === 0) {
                          toast.error("Aggiungi almeno una traccia nella Libreria.");
                          return;
                        }
                        toggleMusicCategory(c.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Atmosfere" description="Più categorie possono suonare insieme.">
              {atmosCats.length === 0 ? (
                <p className="text-sm text-zinc-500">{emptyCatsHint}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {atmosCats.map((c) => (
                    <CategoryTile
                      key={c.id}
                      name={c.name}
                      active={Boolean(activeAtmosphereIds[c.id])}
                      disabled={c.tracks.length === 0}
                      onClick={() => {
                        if (c.tracks.length === 0) {
                          toast.error("Aggiungi almeno una traccia nella Libreria.");
                          return;
                        }
                        toggleAtmosphereCategory(c.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Spotify" description="Solo playlist attiva (nessun player qui). Il riquadro Spotify è nel dock a schermo; da telefono usa il telecomando.">
              <GmSpotifyPlayerPanel
                spotifyEmbedPlaylistId={spotifyEmbedPlaylistId}
                onSpotifyEmbedPlaylistIdChange={onSpotifyEmbedPlaylistIdChange}
              />
            </SectionCard>

            <SectionCard title="Pad SFX" description="Dodici slot rapidi. Assegna suoni nella Libreria.">
              <GmSfxPadPanel
                library={library}
                setLibrary={setLibrary}
                playSfxUrl={playSfxUrl}
                isAllowedAudioUrl={isAllowedAudioUrl}
              />
            </SectionCard>

            <SectionCard
              title="SFX da categorie"
              description="Suoni casuali e ripetizione dalle categorie SFX della campagna."
            >
              {sfxCats.length === 0 ? (
                <p className="text-sm text-zinc-500">{emptyCatsHint}</p>
              ) : (
                <ul className="space-y-3">
                  {sfxCats.map((c) => {
                    const bgOn = sfxBackgroundArmedIds.includes(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex flex-col gap-3 rounded-xl border border-amber-900/25 bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100">{c.name}</p>
                          <p className="text-xs text-zinc-500">
                            Casuale a ogni pressione
                            {c.sfxBackgroundRepeat ? " · ripetizione attivabile" : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg bg-amber-600 text-zinc-950 hover:bg-amber-500"
                            disabled={c.tracks.length === 0}
                            onClick={() => {
                              if (c.tracks.length === 0) toast.error("Aggiungi tracce nella Libreria.");
                              else playSfxRandom(c.id);
                            }}
                          >
                            Riproduci
                          </Button>
                          {c.sfxBackgroundRepeat ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={bgOn ? "secondary" : "outline"}
                              className={cn(
                                "rounded-lg",
                                bgOn ? "border-amber-500/40 bg-amber-900/30 text-amber-100" : "border-amber-800/40"
                              )}
                              disabled={c.tracks.length === 0}
                              onClick={() => toggleSfxBackground(c.id)}
                            >
                              {bgOn ? "Ferma ripetizione" : "Ripetizione"}
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="library" className="mt-0 min-h-0 flex-1 space-y-8 overflow-y-auto overflow-x-hidden pb-2 pr-0.5">
            <SectionCard title="Catalogo Gilda" description="Tracce condivise dagli admin: aggiungile alle tue categorie.">
              <GmGlobalAudioCatalog library={library} setLibrary={setLibrary} />
            </SectionCard>

            <SectionCard title="Categorie campagna" description="Musica, atmosfere ed SFX per questa campagna. URL manuali solo HTTPS.">
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-900/20 bg-zinc-950/40 p-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className="text-xs text-zinc-400">Nuova categoria</Label>
                  <Select value={newKind} onValueChange={(v) => setNewKind(v as GmAudioCategoryKind)}>
                    <SelectTrigger className="rounded-lg border-amber-800/40 bg-zinc-950 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-800/40 bg-zinc-950">
                      <SelectItem value="music">Musica</SelectItem>
                      <SelectItem value="atmosphere">Atmosfera</SelectItem>
                      <SelectItem value="sfx">SFX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 rounded-lg bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  onClick={addCategory}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi categoria
                </Button>
              </div>

              <div className="space-y-3">
                {library.categories.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nessuna categoria ancora.</p>
                ) : (
                  library.categories.map((c) => {
                    const openRow = expandedId === c.id;
                    const nt = getNewTrackFields(c.id);
                    return (
                      <div
                        key={c.id}
                        className="overflow-hidden rounded-xl border border-amber-800/30 bg-zinc-950/40 shadow-sm"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-800/40"
                          onClick={() => setExpandedId(openRow ? null : c.id)}
                        >
                          <span className="font-medium text-zinc-100">
                            {c.name}
                            <span className="ml-2 text-xs font-normal text-zinc-500">
                              {c.kind} · {c.tracks.length} tracce
                            </span>
                          </span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-800/40 text-xs text-amber-400">
                            {openRow ? "−" : "+"}
                          </span>
                        </button>
                        {openRow ? (
                          <div className="space-y-4 border-t border-amber-900/25 bg-zinc-950/30 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-zinc-400">Nome</Label>
                                <Input
                                  value={c.name}
                                  onChange={(e) => patchCategory(c.id, { name: e.target.value })}
                                  className="rounded-lg border-amber-800/40 bg-zinc-950 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-zinc-400">Riproduzione brani</Label>
                                <Select
                                  value={c.playbackMode}
                                  onValueChange={(v) =>
                                    patchCategory(c.id, { playbackMode: v as GmAudioPlaybackMode })
                                  }
                                >
                                  <SelectTrigger className="rounded-lg border-amber-800/40 bg-zinc-950 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="border-amber-800/40 bg-zinc-950">
                                    <SelectItem value="shuffle">Shuffle tra brani</SelectItem>
                                    <SelectItem value="loop_one">Loop singolo brano (casuale)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {c.kind === "sfx" ? (
                              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <Label htmlFor={`sfx-bg-${c.id}`} className="text-xs text-zinc-300">
                                    Ripetizione casuale
                                  </Label>
                                  <Switch
                                    id={`sfx-bg-${c.id}`}
                                    checked={c.sfxBackgroundRepeat}
                                    onCheckedChange={(checked) =>
                                      patchCategory(c.id, { sfxBackgroundRepeat: checked })
                                    }
                                  />
                                </div>
                                {c.sfxBackgroundRepeat ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-[11px] text-zinc-500">Pausa min (ms)</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={c.sfxRepeatGapMinMs}
                                        onChange={(e) =>
                                          patchCategory(c.id, { sfxRepeatGapMinMs: Number(e.target.value) || 0 })
                                        }
                                        className="rounded-lg border-amber-800/40 bg-zinc-950 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] text-zinc-500">Pausa max (ms)</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={c.sfxRepeatGapMaxMs}
                                        onChange={(e) =>
                                          patchCategory(c.id, { sfxRepeatGapMaxMs: Number(e.target.value) || 0 })
                                        }
                                        className="rounded-lg border-amber-800/40 bg-zinc-950 text-sm"
                                      />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="space-y-2">
                              <Label className="text-xs text-zinc-400">Tracce (HTTPS o path /…)</Label>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                                <Input
                                  placeholder="https://…"
                                  value={nt.url}
                                  onChange={(e) => setNewTrackFields(c.id, { url: e.target.value })}
                                  className="min-w-0 flex-1 rounded-lg border-amber-800/40 bg-zinc-950 text-sm"
                                />
                                <Input
                                  placeholder="Etichetta"
                                  value={nt.label}
                                  onChange={(e) => setNewTrackFields(c.id, { label: e.target.value })}
                                  className="rounded-lg border-amber-800/40 bg-zinc-950 text-sm sm:max-w-[10rem]"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="shrink-0 rounded-lg"
                                  onClick={() => addTrackToCategory(c.id)}
                                >
                                  Aggiungi traccia
                                </Button>
                              </div>
                              <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2 text-xs">
                                {c.tracks.map((t) => (
                                  <li
                                    key={t.id}
                                    className="flex items-center justify-between gap-2 rounded-md border border-zinc-800/60 bg-zinc-900/80 px-2.5 py-1.5"
                                  >
                                    <span className="min-w-0 truncate text-zinc-300" title={t.url}>
                                      {t.label}
                                    </span>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 shrink-0 rounded-md text-red-400 hover:bg-red-950/40 hover:text-red-300"
                                      onClick={() => removeTrack(c.id, t.id)}
                                      aria-label="Rimuovi traccia"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg border-red-900/50 text-red-400 hover:bg-red-950/30"
                              onClick={() => {
                                removeCategory(c.id);
                                toast.message("Categoria rimossa.");
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Elimina categoria
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
