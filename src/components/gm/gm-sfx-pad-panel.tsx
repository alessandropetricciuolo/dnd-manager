"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createDefaultSfxPad, type GmAudioForgeLibrary, type SfxPadSlot } from "@/lib/gm-audio-forge/types";
import { getSfxPadIconComponent, SFX_PAD_ICON_OPTIONS } from "@/lib/gm-audio-forge/sfx-pad-icons";
import { normalizeAudioUrl } from "@/lib/gm-audio-forge/url-validation";

type Props = {
  library: GmAudioForgeLibrary;
  setLibrary: React.Dispatch<React.SetStateAction<GmAudioForgeLibrary>>;
  playSfxUrl: (url: string) => void;
  isAllowedAudioUrl: (url: string) => boolean;
};

function sortedSlots(lib: GmAudioForgeLibrary): SfxPadSlot[] {
  return [...lib.sfxPad.slots].sort((a, b) => a.slotIndex - b.slotIndex);
}

/** Riferimento univoco categoria+traccia (Radix Select richiede value unici; più tracce possono avere lo stesso URL). */
function sfxPadLibraryRef(categoryId: string, trackId: string): string {
  return `${categoryId}|${trackId}`;
}

function reorderSfxPadSlots(slots: SfxPadSlot[], from: number, to: number): SfxPadSlot[] {
  const ordered = [...slots].sort((a, b) => a.slotIndex - b.slotIndex);
  if (from === to || from < 0 || to < 0 || from > 11 || to > 11) return ordered;
  const next = [...ordered];
  const [item] = next.splice(from, 1);
  if (!item) return ordered;
  next.splice(to, 0, item);
  return next.map((s, i) => ({ ...s, slotIndex: i }));
}

/** Dopo uno spostamento from→to, mappa l’indice di tasto selezionato sul nuovo ordine. */
function mapSlotIndexAfterReorder(from: number, to: number, selected: number): number {
  if (selected === from) return to;
  if (from < to) {
    if (selected > from && selected <= to) return selected - 1;
    return selected;
  }
  if (from > to) {
    if (selected >= to && selected < from) return selected + 1;
    return selected;
  }
  return selected;
}

const DND_MIME = "application/x-bd-sfx-pad-index";

export function GmSfxPadPanel({ library, setLibrary, playSfxUrl, isAllowedAudioUrl }: Props) {
  const [customize, setCustomize] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [manualUrlDraft, setManualUrlDraft] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const suppressPadClickUntilRef = useRef(0);

  const slots = useMemo(() => sortedSlots(library), [library]);

  const sfxTrackOptions = useMemo(() => {
    const out: { ref: string; url: string; label: string }[] = [];
    for (const c of library.categories) {
      if (c.kind !== "sfx") continue;
      for (const t of c.tracks) {
        out.push({
          ref: sfxPadLibraryRef(c.id, t.id),
          url: t.url,
          label: `${c.name} — ${t.label}`,
        });
      }
    }
    return out;
  }, [library.categories]);

  const editing = selectedSlot !== null ? slots.find((s) => s.slotIndex === selectedSlot) : null;

  useEffect(() => {
    if (selectedSlot === null) return;
    const s = library.sfxPad.slots.find((x) => x.slotIndex === selectedSlot);
    if (s) setManualUrlDraft(s.trackUrl);
  }, [selectedSlot, library.sfxPad.slots]);

  function updateSlot(slotIndex: number, patch: Partial<SfxPadSlot>) {
    setLibrary((lib) => ({
      ...lib,
      sfxPad: {
        slots: lib.sfxPad.slots.map((s) => (s.slotIndex === slotIndex ? { ...s, ...patch } : s)),
      },
    }));
  }

  function applyReorder(from: number, to: number) {
    if (from === to) return;
    setLibrary((lib) => ({
      ...lib,
      sfxPad: { slots: reorderSfxPadSlots(lib.sfxPad.slots, from, to) },
    }));
    setSelectedSlot((prev) =>
      prev === null ? null : mapSlotIndexAfterReorder(from, to, prev)
    );
  }

  function handlePadClick(slot: SfxPadSlot) {
    if (Date.now() < suppressPadClickUntilRef.current) return;
    if (customize) {
      setSelectedSlot(slot.slotIndex);
      setManualUrlDraft(slot.trackUrl);
      return;
    }
    const u = slot.trackUrl.trim();
    if (!u) {
      toast.message("Tasto vuoto. Attiva «Personalizza» per assegnare un suono.");
      return;
    }
    playSfxUrl(u);
  }

  function applyManualUrl() {
    if (selectedSlot === null) return;
    const u = normalizeAudioUrl(manualUrlDraft);
    if (u && !isAllowedAudioUrl(u)) {
      toast.error("URL non valido (solo HTTPS o path /…).");
      return;
    }
    updateSlot(selectedSlot, { trackUrl: u, libraryRef: undefined });
    toast.success("URL salvato sul tasto.");
  }

  function resetPadDefaults() {
    if (!confirm("Ripristinare icone ed etichette predefinite? I collegamenti audio verranno azzerati.")) return;
    setLibrary((lib) => ({ ...lib, sfxPad: createDefaultSfxPad() }));
    setSelectedSlot(null);
    setManualUrlDraft("");
    toast.success("Pad predefinito ripristinato.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="sfx-pad-customize"
            checked={customize}
            onCheckedChange={(v) => {
              setCustomize(v);
              if (!v) {
                setSelectedSlot(null);
                setDraggingIndex(null);
                setDragOverIndex(null);
              }
            }}
          />
          <Label htmlFor="sfx-pad-customize" className="cursor-pointer text-sm text-zinc-300">
            Personalizza tasti (icona + suono)
          </Label>
        </div>
        {customize ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-800/50 text-amber-200"
            onClick={resetPadDefaults}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Ripristina predefinito
          </Button>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500">
        {customize
          ? "Tocca un tasto per modificarlo. Scegli un brano dalla libreria o incolla un URL. Trascina per riordinare."
          : "Tocca un’icona per riprodurre. Il volume master SFX è nel Mixer sopra."}
      </p>

      <div
        className={cn(
          "grid gap-2",
          "grid-cols-3 sm:grid-cols-4",
          customize && selectedSlot !== null && "opacity-90"
        )}
      >
        {slots.map((slot) => {
          const Icon = getSfxPadIconComponent(slot.iconKey);
          const idx = slot.slotIndex;
          const active = customize && selectedSlot === idx;
          const hasSound = slot.trackUrl.trim().length > 0;
          const isDragOver = customize && dragOverIndex === idx && draggingIndex !== idx;
          return (
            <button
              key={idx}
              type="button"
              draggable={customize}
              onDragStart={(e) => {
                if (!customize) return;
                e.dataTransfer.setData(DND_MIME, String(idx));
                e.dataTransfer.effectAllowed = "move";
                setDraggingIndex(idx);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                if (!customize || draggingIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverIndex(idx);
              }}
              onDragLeave={() => {
                setDragOverIndex((cur) => (cur === idx ? null : cur));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData(DND_MIME);
                const from = parseInt(raw, 10);
                setDragOverIndex(null);
                setDraggingIndex(null);
                if (!Number.isInteger(from) || from < 0 || from > 11) return;
                if (from !== idx) {
                  suppressPadClickUntilRef.current = Date.now() + 400;
                  applyReorder(from, idx);
                }
              }}
              onClick={() => handlePadClick(slot)}
              className={cn(
                "relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-colors",
                customize && "cursor-grab active:cursor-grabbing",
                draggingIndex === idx && "opacity-40",
                isDragOver && "border-amber-300 ring-2 ring-amber-400/40",
                active
                  ? "border-amber-400 bg-amber-600/30 text-amber-50 ring-1 ring-amber-400/50"
                  : "border-amber-800/45 bg-zinc-900/70 text-amber-100/90 hover:border-amber-600/50 hover:bg-zinc-800/80",
                !hasSound && !customize && "opacity-60"
              )}
              aria-label={slot.etichetta || `Tasto ${idx + 1}`}
            >
              {customize ? (
                <span className="pointer-events-none absolute left-1 top-1 text-zinc-600" aria-hidden>
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <Icon className="h-7 w-7 shrink-0 text-amber-400" />
              {customize ? (
                <span className="line-clamp-2 text-center text-[9px] font-medium text-zinc-400">
                  {slot.etichetta || `Slot ${idx + 1}`}
                </span>
              ) : hasSound ? (
                <span className="line-clamp-2 text-center text-[9px] text-zinc-500">{slot.etichetta}</span>
              ) : (
                <Settings2 className="h-3 w-3 text-zinc-600" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {customize && editing ? (
        <div className="space-y-4 rounded-xl border border-amber-800/35 bg-zinc-900/50 p-3">
          <p className="text-xs font-medium text-amber-200/90">
            Modifica tasto {editing.slotIndex + 1}
          </p>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500">Etichetta</Label>
            <Input
              value={editing.etichetta}
              onChange={(e) => updateSlot(editing.slotIndex, { etichetta: e.target.value })}
              className="border-amber-800/40 bg-zinc-950 text-sm"
              placeholder="Nome sul tasto"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] text-zinc-500">Icona</Label>
            <div className="flex flex-wrap gap-1.5">
              {SFX_PAD_ICON_OPTIONS.map((key) => {
                const Ic = getSfxPadIconComponent(key);
                const on = editing.iconKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={key}
                    onClick={() => updateSlot(editing.slotIndex, { iconKey: key })}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                      on
                        ? "border-amber-400 bg-amber-600/25 text-amber-100"
                        : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-amber-800/60"
                    )}
                  >
                    <Ic className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500">Brano dalla libreria (SFX)</Label>
            <Select
              value={(() => {
                if (!editing) return "__none__";
                if (
                  editing.libraryRef &&
                  sfxTrackOptions.some((o) => o.ref === editing.libraryRef)
                ) {
                  return editing.libraryRef;
                }
                const u = editing.trackUrl.trim();
                if (u) {
                  const hit = sfxTrackOptions.find((o) => o.url === u);
                  if (hit) return hit.ref;
                }
                return "__none__";
              })()}
              onValueChange={(v) => {
                const idx = selectedSlot;
                if (idx === null) return;
                if (v === "__none__") {
                  updateSlot(idx, { trackUrl: "", libraryRef: undefined });
                  setManualUrlDraft("");
                  return;
                }
                const opt = sfxTrackOptions.find((o) => o.ref === v);
                if (opt) {
                  updateSlot(idx, { trackUrl: opt.url, libraryRef: opt.ref });
                  setManualUrlDraft(opt.url);
                }
              }}
            >
              <SelectTrigger className="border-amber-800/40 bg-zinc-950 text-sm">
                <SelectValue placeholder="Nessuno" />
              </SelectTrigger>
              <SelectContent className="max-h-60 border-amber-800/40 bg-zinc-950">
                <SelectItem value="__none__">Nessuno</SelectItem>
                {sfxTrackOptions.map((o) => (
                  <SelectItem key={o.ref} value={o.ref} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sfxTrackOptions.length === 0 ? (
              <p className="text-[11px] text-zinc-600">Aggiungi categorie SFX e tracce in Libreria.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500">Oppure incolla un URL (HTTPS)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={manualUrlDraft}
                onChange={(e) => setManualUrlDraft(e.target.value)}
                placeholder="https://…"
                className="border-amber-800/40 bg-zinc-950 text-sm"
              />
              <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={applyManualUrl}>
                Applica URL
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
