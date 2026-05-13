"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listGlobalAudioLibraryForGmAction } from "@/app/campaigns/gm-global-audio-actions";
import type { GmGlobalAudioRow, GmGlobalAudioType } from "@/lib/gm-global-audio/types";
import type { GmAudioForgeLibrary } from "@/lib/gm-audio-forge/types";
import { newGmAudioEntityId } from "@/lib/gm-audio-forge/use-gm-audio-forge";

const TYPE_LABEL: Record<GmGlobalAudioType, string> = {
  music: "Musica",
  sfx: "SFX",
  atmosphere: "Atmosfera",
};

type Props = {
  library: GmAudioForgeLibrary;
  setLibrary: React.Dispatch<React.SetStateAction<GmAudioForgeLibrary>>;
};

export function GmGlobalAudioCatalog({ library, setLibrary }: Props) {
  const [rows, setRows] = useState<GmGlobalAudioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterText, setFilterText] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await listGlobalAudioLibraryForGmAction();
    setLoading(false);
    if (res.success) setRows(res.data);
    else setLoadError(res.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryOptions = useMemo(
    () =>
      library.categories.map((c) => ({
        id: c.id,
        label: `${c.name} (${c.kind})`,
        kind: c.kind,
      })),
    [library.categories]
  );

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterType !== "all" && r.audio_type !== filterType) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.mood.toLowerCase().includes(q) ||
        TYPE_LABEL[r.audio_type].toLowerCase().includes(q)
      );
    });
  }, [rows, filterType, filterText]);

  function addToLocalCategory(track: GmGlobalAudioRow) {
    if (!targetCategoryId) {
      toast.error("Scegli una categoria nelle Impostazioni (o creane una), poi selezionala qui.");
      return;
    }
    const cat = library.categories.find((c) => c.id === targetCategoryId);
    if (!cat) {
      toast.error("Categoria non trovata.");
      return;
    }
    if (cat.kind === "music" && track.audio_type !== "music") {
      toast.error("Per categorie Musica usa tracce catalogate come Musica.");
      return;
    }
    if (cat.kind === "atmosphere" && track.audio_type !== "atmosphere") {
      toast.error("Per Atmosfera usa tracce catalogate come Atmosfera.");
      return;
    }
    if (cat.kind === "sfx" && track.audio_type !== "sfx") {
      toast.error("Per SFX usa tracce catalogate come SFX.");
      return;
    }
    setLibrary((lib) => ({
      ...lib,
      categories: lib.categories.map((c) =>
        c.id === targetCategoryId
          ? {
              ...c,
              tracks: [
                ...c.tracks,
                { id: newGmAudioEntityId(), label: track.title, url: track.public_url },
              ],
            }
          : c
      ),
    }));
    toast.success(`Aggiunto a «${cat.name}». Vai al Mixer o agli fx per riprodurlo.`);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Libreria caricata dagli admin su Cloudflare. Aggiungi una traccia a una tua categoria locale (Impostazioni),
        poi usala dal Mixer / fx.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-700/50 text-amber-200"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aggiorna elenco"}
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-[11px] text-zinc-500">Aggiungi a categoria locale</Label>
          <Select value={targetCategoryId || "none"} onValueChange={(v) => setTargetCategoryId(v === "none" ? "" : v)}>
            <SelectTrigger className="border-amber-800/40 bg-zinc-950 text-sm text-zinc-200">
              <SelectValue placeholder="Scegli categoria…" />
            </SelectTrigger>
            <SelectContent className="border-amber-800/40 bg-zinc-950">
              <SelectItem value="none" className="text-zinc-400">
                — Nessuna —
              </SelectItem>
              {categoryOptions.map((o) => (
                <SelectItem key={o.id} value={o.id} className="text-zinc-200">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-500">Tipo</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="border-amber-800/40 bg-zinc-950 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-amber-800/40 bg-zinc-950">
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="music">Musica</SelectItem>
              <SelectItem value="sfx">SFX</SelectItem>
              <SelectItem value="atmosphere">Atmosfera</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-500">Cerca</Label>
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Titolo o mood…"
            className="border-amber-800/40 bg-zinc-950 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento…
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-400">{loadError}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">Nessuna traccia in catalogo (o filtro troppo stretto).</p>
      ) : (
        <ul className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto pr-1">
          {filtered.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border border-amber-900/30 bg-zinc-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{r.title}</p>
                <p className="text-[11px] text-zinc-500">
                  {TYPE_LABEL[r.audio_type]} · {r.mood || "— mood"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 border-amber-800/40 bg-zinc-800 text-zinc-100"
                  onClick={() => {
                    const a = new Audio(r.public_url);
                    void a.play().catch(() => toast.error("Anteprima non disponibile (CORS o rete)."));
                  }}
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Play
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  onClick={() => addToLocalCategory(r)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Aggiungi
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
