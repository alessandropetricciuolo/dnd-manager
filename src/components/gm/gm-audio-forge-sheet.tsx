"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Headphones, Plus, Trash2, Volume2, Square } from "lucide-react";
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
        "flex min-h-[4.5rem] flex-col items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors",
        active
          ? "border-amber-400 bg-amber-600/25 text-amber-100"
          : "border-amber-700/40 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800/80",
        disabled && "cursor-not-allowed opacity-40"
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
    toast.success("Categoria aggiunta. Configurala nelle Impostazioni.");
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-none flex-col border-l border-amber-600/25 bg-zinc-950 p-0 sm:max-w-3xl"
      >
        <SheetHeader className="border-b border-amber-800/30 px-4 pb-3 pt-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2 text-amber-100">
            <Headphones className="h-5 w-5 text-amber-400" />
            Audio
          </SheetTitle>
          <p className="text-xs leading-relaxed text-zinc-400">
            Libreria locale per campagna + <strong className="font-medium text-zinc-300">catalogo Gilda</strong> (tab
            Catalogo). Nel tab <strong className="font-medium text-zinc-300">Mixer</strong> trovi musica, atmosfere,
            playlist Spotify e il pad SFX a 12 tasti. URL manuali solo HTTPS. Ispirato al flusso{" "}
            <a
              href="https://slashpaf.com/it/audioforge/doc/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 underline-offset-2 hover:underline"
            >
              Audio Forge
            </a>
            : una musica alla volta, più atmosfere, SFX one-shot.
          </p>
        </SheetHeader>

        <Tabs defaultValue="mixer" className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
          <TabsList className="h-auto min-h-9 shrink-0 flex-wrap gap-0.5 bg-zinc-900/80 p-0.5">
            <TabsTrigger value="mixer" className="text-xs data-[state=active]:bg-amber-600/25">
              Mixer
            </TabsTrigger>
            <TabsTrigger value="catalog" className="text-xs data-[state=active]:bg-amber-600/25">
              Catalogo
            </TabsTrigger>
            <TabsTrigger value="fx" className="text-xs data-[state=active]:bg-amber-600/25">
              fx
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-amber-600/25">
              Impostazioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <GmGlobalAudioCatalog library={library} setLibrary={setLibrary} />
          </TabsContent>

          <TabsContent
            value="mixer"
            forceMount
            className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 data-[state=inactive]:hidden"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-800/50 text-red-300 hover:bg-red-950/40"
                onClick={() => {
                  stopAll();
                  toast.message("Tutto fermato.");
                }}
              >
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Stop tutto
              </Button>
            </div>

            <div className="mb-6 space-y-3 rounded-lg border border-amber-800/25 bg-zinc-900/40 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-200/90">
                <Volume2 className="h-3.5 w-3.5" />
                Musica (master)
              </div>
              <Slider
                value={[musicMaster * 100]}
                max={100}
                step={1}
                onValueChange={(v) => setMusicMaster((v[0] ?? 0) / 100)}
              />
              <div className="flex items-center gap-2 text-xs font-medium text-amber-200/90">
                <Volume2 className="h-3.5 w-3.5" />
                Atmosfere (master)
              </div>
              <Slider
                value={[atmosMaster * 100]}
                max={100}
                step={1}
                onValueChange={(v) => setAtmosMaster((v[0] ?? 0) / 100)}
              />
              <div className="flex items-center gap-2 text-xs font-medium text-amber-200/90">
                <Volume2 className="h-3.5 w-3.5" />
                SFX (master)
              </div>
              <Slider
                value={[sfxMaster * 100]}
                max={100}
                step={1}
                onValueChange={(v) => setSfxMaster((v[0] ?? 0) / 100)}
              />
            </div>

            <p className="mb-2 rounded-md border border-amber-900/30 bg-zinc-900/50 px-2 py-2 text-[11px] leading-relaxed text-zinc-400">
              <strong className="text-zinc-300">Musica:</strong> tocca un riquadro per <em>avviare</em> quella
              categoria; tocca di nuovo la stessa per <em>fermare</em>. Se avevi incollato l&apos;URL pubblico R2
              dall&apos;admin, al caricamento della pagina viene sostituito automaticamente con il proxy del sito (
              <code className="text-amber-200/90">/api/gm-global-audio-preview</code>).
            </p>

            <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Musica — una categoria attiva</p>
            {musicCats.length === 0 ? (
              <p className="text-sm text-zinc-500">Aggiungi categorie nelle Impostazioni.</p>
            ) : (
              <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {musicCats.map((c) => (
                  <CategoryTile
                    key={c.id}
                    name={c.name}
                    active={activeMusicCategoryId === c.id}
                    disabled={c.tracks.length === 0}
                    onClick={() => {
                      if (c.tracks.length === 0) {
                        toast.error("Aggiungi almeno una traccia nelle Impostazioni.");
                        return;
                      }
                      toggleMusicCategory(c.id);
                    }}
                  />
                ))}
              </div>
            )}

            <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
              Atmosfere — più categorie insieme
            </p>
            {atmosCats.length === 0 ? (
              <p className="text-sm text-zinc-500">Aggiungi categorie nelle Impostazioni.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {atmosCats.map((c) => (
                  <CategoryTile
                    key={c.id}
                    name={c.name}
                    active={Boolean(activeAtmosphereIds[c.id])}
                    disabled={c.tracks.length === 0}
                    onClick={() => {
                      if (c.tracks.length === 0) {
                        toast.error("Aggiungi almeno una traccia nelle Impostazioni.");
                        return;
                      }
                      toggleAtmosphereCategory(c.id);
                    }}
                  />
                ))}
              </div>
            )}

            <div className="mt-8 space-y-3 border-t border-amber-900/30 pt-6">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Spotify</p>
              <GmSpotifyPlayerPanel
                spotifyEmbedPlaylistId={spotifyEmbedPlaylistId}
                onSpotifyEmbedPlaylistIdChange={onSpotifyEmbedPlaylistIdChange}
              />
            </div>

            <div className="mt-8 space-y-3 border-t border-amber-900/30 pt-6">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Pad SFX (12 slot)</p>
              <GmSfxPadPanel
                library={library}
                setLibrary={setLibrary}
                playSfxUrl={playSfxUrl}
                isAllowedAudioUrl={isAllowedAudioUrl}
              />
            </div>
          </TabsContent>

          <TabsContent value="fx" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-4 space-y-2 rounded-lg border border-amber-800/25 bg-zinc-900/40 p-3">
              <Label className="text-xs text-zinc-400">Volume SFX (stesso controllo del Mixer)</Label>
              <Slider
                value={[sfxMaster * 100]}
                max={100}
                step={1}
                onValueChange={(v) => setSfxMaster((v[0] ?? 0) / 100)}
              />
            </div>
            {sfxCats.length === 0 ? (
              <p className="text-sm text-zinc-500">Aggiungi categorie SFX nelle Impostazioni.</p>
            ) : (
              <div className="space-y-3">
                {sfxCats.map((c) => {
                  const bgOn = sfxBackgroundArmedIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 rounded-lg border border-amber-800/25 bg-zinc-900/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{c.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          Tocco: suono casuale
                          {c.sfxBackgroundRepeat ? " · Ripetizione disponibile" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                          disabled={c.tracks.length === 0}
                          onClick={() => {
                            if (c.tracks.length === 0) toast.error("Aggiungi tracce nelle Impostazioni.");
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
                              bgOn ? "border-amber-500/40 bg-amber-900/30 text-amber-100" : "border-amber-800/40"
                            )}
                            disabled={c.tracks.length === 0}
                            onClick={() => toggleSfxBackground(c.id)}
                          >
                            {bgOn ? "Ferma ripetizione" : "Ripetizione"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-800/25 bg-zinc-900/40 p-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-zinc-400">Nuova categoria</Label>
                <Select value={newKind} onValueChange={(v) => setNewKind(v as GmAudioCategoryKind)}>
                  <SelectTrigger className="border-amber-800/40 bg-zinc-950 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-800/40 bg-zinc-950">
                    <SelectItem value="music">Musica</SelectItem>
                    <SelectItem value="atmosphere">Atmosfera</SelectItem>
                    <SelectItem value="sfx">SFX (fx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" className="bg-amber-600 text-zinc-950 hover:bg-amber-500" onClick={addCategory}>
                <Plus className="mr-1 h-4 w-4" />
                Aggiungi
              </Button>
            </div>

            <div className="space-y-2">
              {library.categories.length === 0 ? (
                <p className="text-sm text-zinc-500">Nessuna categoria.</p>
              ) : (
                library.categories.map((c) => {
                  const openRow = expandedId === c.id;
                  const nt = getNewTrackFields(c.id);
                  return (
                    <div key={c.id} className="rounded-lg border border-amber-800/30 bg-zinc-900/50">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800/50"
                        onClick={() => setExpandedId(openRow ? null : c.id)}
                      >
                        <span className="font-medium text-zinc-100">
                          {c.name}{" "}
                          <span className="text-xs font-normal text-zinc-500">
                            ({c.kind}) · {c.tracks.length} tracce
                          </span>
                        </span>
                        <span className="text-xs text-amber-500/80">{openRow ? "−" : "+"}</span>
                      </button>
                      {openRow ? (
                        <div className="space-y-3 border-t border-amber-900/30 px-3 py-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={c.name}
                                onChange={(e) => patchCategory(c.id, { name: e.target.value })}
                                className="border-amber-800/40 bg-zinc-950 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Riproduzione brani</Label>
                              <Select
                                value={c.playbackMode}
                                onValueChange={(v) => patchCategory(c.id, { playbackMode: v as GmAudioPlaybackMode })}
                              >
                                <SelectTrigger className="border-amber-800/40 bg-zinc-950 text-sm">
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
                            <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`sfx-bg-${c.id}`} className="text-xs text-zinc-300">
                                  Ripetizione casuale (fx)
                                </Label>
                                <Switch
                                  id={`sfx-bg-${c.id}`}
                                  checked={c.sfxBackgroundRepeat}
                                  onCheckedChange={(checked) => patchCategory(c.id, { sfxBackgroundRepeat: checked })}
                                />
                              </div>
                              {c.sfxBackgroundRepeat ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[11px] text-zinc-500">Pausa min (ms)</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={c.sfxRepeatGapMinMs}
                                      onChange={(e) =>
                                        patchCategory(c.id, { sfxRepeatGapMinMs: Number(e.target.value) || 0 })
                                      }
                                      className="border-amber-800/40 bg-zinc-950 text-sm"
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
                                      className="border-amber-800/40 bg-zinc-950 text-sm"
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Tracce (URL + etichetta)</Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Input
                                placeholder="https://…"
                                value={nt.url}
                                onChange={(e) => setNewTrackFields(c.id, { url: e.target.value })}
                                className="border-amber-800/40 bg-zinc-950 text-sm"
                              />
                              <Input
                                placeholder="Etichetta"
                                value={nt.label}
                                onChange={(e) => setNewTrackFields(c.id, { label: e.target.value })}
                                className="border-amber-800/40 bg-zinc-950 text-sm sm:max-w-[10rem]"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="shrink-0"
                                onClick={() => addTrackToCategory(c.id)}
                              >
                                Aggiungi traccia
                              </Button>
                            </div>
                            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                              {c.tracks.map((t) => (
                                <li
                                  key={t.id}
                                  className="flex items-center justify-between gap-2 rounded border border-zinc-800/80 bg-zinc-950/80 px-2 py-1"
                                >
                                  <span className="min-w-0 truncate text-zinc-300" title={t.url}>
                                    {t.label}
                                  </span>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 shrink-0 text-red-400 hover:bg-red-950/40 hover:text-red-300"
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
                            className="border-red-900/50 text-red-400 hover:bg-red-950/30"
                            onClick={() => {
                              removeCategory(c.id);
                              toast.message("Categoria rimossa.");
                            }}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Elimina categoria
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
